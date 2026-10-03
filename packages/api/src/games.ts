/**
 * 例のゲーム(数当て)のルート。ゲームを置き換えるときは、このファイルを丸ごと差し替える。
 * 判定はすべてここでgame-rule-engineを呼んで行う(サーバー権威)。
 */
import { Hono } from "hono";
import { applyGuess, isValidGuess, MAX_GUESS, MIN_GUESS, newGame, status, view, type GameState, type GameView } from "game-rule-engine";
import type { BestScore, CreatedGame, GuessResult } from "./responses.js";
import { currentUserId, requireUser, type AppEnv } from "./session.js";

const games = new Hono<AppEnv>();

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
games.post("/games", async (c) => {
  const id = crypto.randomUUID();
  const state = newGame(randomSeed());
  await c.env.DB.prepare("INSERT INTO example_game (id, state) VALUES (?, ?)").bind(id, JSON.stringify(state)).run();
  return c.json({ id, ...view(state) } satisfies CreatedGame, 201);
});

games.get("/games/:id", async (c) => {
  const game = await loadGame(c.env.DB, c.req.param("id"));
  if (!game) return c.json({ error: NO_GAME }, 404);
  return c.json(view(game.state) satisfies GameView);
});

/** 1手進める。勝てば、サインインしているときだけ自己ベストを更新し、更新後の値を`best`で返す */
games.post("/games/:id/guesses", async (c) => {
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
games.get("/best", requireUser, async (c) => {
  const row = await c.env.DB.prepare("SELECT score FROM example_best_score WHERE user_id = ?")
    .bind(currentUserId(c))
    .first<{ score: number }>();
  return c.json({ best: row?.score ?? null } satisfies BestScore);
});

export default games;
