/**
 * アプリケーション層。Cloudflare WorkersのWorkerとして動く。
 * 判定はすべてこのサーバー側でgame-rule-engineを呼んで行う(サーバー権威)。
 */
import { Hono } from "hono";
import { applyGuess, isValidGuess, newGame, status, view, type GameState } from "game-rule-engine";
import { auth } from "./auth.js";
import { attachUser, currentUserId, requireUser, type AppEnv } from "./session.js";

/** すべてのエンドポイントは/api配下に置く。wrangler.jsoncのrun_worker_firstで/api/*だけがこのWorkerに届く */
const app = new Hono<AppEnv>().basePath("/api");

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

/** 新しいゲームを始める。IDを知っていれば誰でも続きを遊べるので、推測できないUUIDにする */
app.post("/games", async (c) => {
  const id = crypto.randomUUID();
  const state = newGame(randomSeed());
  await c.env.DB.prepare("INSERT INTO example_game (id, state) VALUES (?, ?)").bind(id, JSON.stringify(state)).run();
  return c.json({ id, ...view(state) }, 201);
});

app.get("/games/:id", async (c) => {
  const row = await c.env.DB.prepare("SELECT state FROM example_game WHERE id = ?").bind(c.req.param("id")).first<{ state: string }>();
  if (!row) return c.json({ error: "そのゲームはありません。新しいゲームを始めてください" }, 404);
  return c.json(view(JSON.parse(row.state) as GameState));
});

/** 1手進める。勝てば、サインインしているときだけ自己ベストを更新し、更新後の値を`best`で返す */
app.post("/games/:id/guesses", async (c) => {
  const body = await c.req.json().catch(() => null);
  const guess: unknown = body?.guess;
  if (!isValidGuess(guess)) return c.json({ error: "0〜99の整数を選んでください" }, 400);

  const id = c.req.param("id");
  const row = await c.env.DB.prepare("SELECT state FROM example_game WHERE id = ?").bind(id).first<{ state: string }>();
  if (!row) return c.json({ error: "そのゲームはありません。新しいゲームを始めてください" }, 404);
  const state = JSON.parse(row.state) as GameState;
  if (status(state) !== "playing") return c.json({ error: "このゲームは終わっています。新しいゲームを始めてください" }, 409);

  const next = applyGuess(state, guess);
  // 読んでから書き戻すまでに、別のタブなどから同じゲームが進んでいたら書かない。上書きすると1手が消える
  const { meta } = await c.env.DB.prepare("UPDATE example_game SET state = ? WHERE id = ? AND state = ?")
    .bind(JSON.stringify(next), id, row.state)
    .run();
  if (meta.changes === 0) return c.json({ error: "別の操作と重なりました。画面を読み直してください" }, 409);

  const result = view(next);
  const userId = c.get("userId");
  if (result.score === undefined || !userId) return c.json(result);
  const best = await c.env.DB.prepare(
    `INSERT INTO best_score (user_id, score) VALUES (?, ?)
     ON CONFLICT (user_id) DO UPDATE SET score = max(score, excluded.score)
     RETURNING score`,
  )
    .bind(userId, result.score)
    .first<{ score: number }>();
  return c.json({ ...result, best: best!.score });
});

/** 自分の自己ベスト。まだ遊んでいなければnull */
app.get("/best", requireUser, async (c) => {
  const row = await c.env.DB.prepare("SELECT score FROM best_score WHERE user_id = ?")
    .bind(currentUserId(c))
    .first<{ score: number }>();
  return c.json({ best: row?.score ?? null });
});

app.notFound((c) => c.json({ error: "そのAPIはありません" }, 404));

/** 最後の砦。中身はログにだけ残し、webのapiClientが読む`{error}`の形で返す */
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "サーバーでエラーが起きました" }, 500);
});

export default app;
