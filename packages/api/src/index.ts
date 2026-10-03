/**
 * アプリケーション層。Cloudflare WorkersのWorkerとして動く。
 * 判定はすべてこのサーバー側でgame-rule-engineを呼んで行う(サーバー権威)。
 */
import { Hono } from "hono";
import { applyGuess, isValidGuess, MAX_GUESS, MIN_GUESS, newGame, status, view, type GameState, type GameView } from "game-rule-engine";
import { auth, discordCredentials } from "./auth.js";
import type { BestScore, CreatedGame, GuessResult } from "./responses.js";
import { attachUser, currentUserId, requireUser, type AppEnv } from "./session.js";

/** すべてのエンドポイントは/api配下に置く。wrangler.jsoncのrun_worker_firstで/api/*だけがこのWorkerに届く */
const app = new Hono<AppEnv>().basePath("/api");

// 設定していないままDiscordへ送ると、Discord側のエラー画面に落ちて原因がわからない。手前で止めて理由を返す
app.post("/auth/sign-in/social", async (c, next) => {
  if (!discordCredentials()) {
    return c.json({ error: "Discordでのサインインが設定されていません。DiscordアプリのClient IDとClient Secretを設定してください" }, 503);
  }
  await next();
});

// ここで応答を返すので、後ろのattachUserは認証のルートでは走らない
app.on(["GET", "POST"], "/auth/*", (c) => auth().handler(c.req.raw));

app.use(attachUser);

/** 疎通確認。deploy.shがデプロイ後に叩く。D1に届かないか、移行が当たっていなければ500になる */
app.get("/health", async (c) => {
  await c.env.DB.prepare("SELECT 1 FROM user LIMIT 1").run();
  return c.json({ ok: true });
});

function randomSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0];
}

const NO_GAME = "そのゲームはありません。新しいゲームを始めてください";

/** 書き戻すときに読んだときと同じかを比べる(楽観ロック)ので、読んだままの文字列も返す */
async function loadGame(db: D1Database, id: string): Promise<{ raw: string; state: GameState } | null> {
  const row = await db.prepare("SELECT state FROM example_game WHERE id = ?").bind(id).first<{ state: string }>();
  return row && { raw: row.state, state: JSON.parse(row.state) as GameState };
}

/** 自己ベストを更新し、更新後の値を返す。前の値より低ければ前の値のまま */
async function saveBest(db: D1Database, userId: string, score: number): Promise<number> {
  const row = await db
    .prepare(
      `INSERT INTO example_best_score (user_id, score) VALUES (?, ?)
       ON CONFLICT (user_id) DO UPDATE SET score = max(score, excluded.score)
       RETURNING score`,
    )
    .bind(userId, score)
    .first<{ score: number }>();
  return row!.score;
}

/** 新しいゲームを始める。IDを知っていれば誰でも続きを遊べるので、推測できないUUIDにする */
app.post("/games", async (c) => {
  const id = crypto.randomUUID();
  const state = newGame(randomSeed());
  await c.env.DB.prepare("INSERT INTO example_game (id, state) VALUES (?, ?)").bind(id, JSON.stringify(state)).run();
  return c.json({ id, ...view(state) } satisfies CreatedGame, 201);
});

app.get("/games/:id", async (c) => {
  const game = await loadGame(c.env.DB, c.req.param("id"));
  if (!game) return c.json({ error: NO_GAME }, 404);
  return c.json(view(game.state) satisfies GameView);
});

/** 1手進める。勝てば、サインインしているときだけ自己ベストを更新し、更新後の値を`best`で返す */
app.post("/games/:id/guesses", async (c) => {
  const body = await c.req.json().catch(() => null);
  const guess: unknown = body?.guess;
  if (!isValidGuess(guess)) return c.json({ error: `${MIN_GUESS}〜${MAX_GUESS}の整数を選んでください` }, 400);

  const id = c.req.param("id");
  const game = await loadGame(c.env.DB, id);
  if (!game) return c.json({ error: NO_GAME }, 404);
  if (status(game.state) !== "playing") return c.json({ error: "このゲームは終わっています。新しいゲームを始めてください" }, 409);

  const next = applyGuess(game.state, guess);
  // 読んでから書き戻すまでに、別のタブなどから同じゲームが進んでいたら書かない。上書きすると1手が消える
  const { meta } = await c.env.DB.prepare("UPDATE example_game SET state = ? WHERE id = ? AND state = ?")
    .bind(JSON.stringify(next), id, game.raw)
    .run();
  if (meta.changes === 0) return c.json({ error: "別の操作と重なりました。画面を読み直してください" }, 409);

  const result = view(next);
  const userId = c.get("userId");
  if (result.score === undefined || !userId) return c.json(result satisfies GuessResult);
  return c.json({ ...result, best: await saveBest(c.env.DB, userId, result.score) } satisfies GuessResult);
});

/** 自分の自己ベスト。まだ遊んでいなければnull */
app.get("/best", requireUser, async (c) => {
  const row = await c.env.DB.prepare("SELECT score FROM example_best_score WHERE user_id = ?")
    .bind(currentUserId(c))
    .first<{ score: number }>();
  return c.json({ best: row?.score ?? null } satisfies BestScore);
});

app.notFound((c) => c.json({ error: "そのAPIはありません。URLとメソッドを確かめてください" }, 404));

/** 最後の砦。中身はログにだけ残し、webのapiClientが読む`{error}`の形で返す */
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "サーバーでエラーが起きました" }, 500);
});

export default app;
