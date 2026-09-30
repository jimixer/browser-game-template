/**
 * アプリケーション層。Cloudflare WorkersのWorkerとして動く。
 * 判定はすべてこのサーバー側でgame-rule-engineを呼んで行う(サーバー権威)。
 */
import { Hono } from "hono";
import { isValidGuess, play } from "game-rule-engine";
import { auth } from "./auth.js";
import { attachUser, type AppEnv } from "./session.js";

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

/** 1回遊ぶ。判定は保存せずに返す。何をどう残すかはゲームごとに決める */
app.post("/play", async (c) => {
  // JSONとして読めない本文も、不正な入力として400で弾く
  const body = await c.req.json().catch(() => null);
  const guess: unknown = body?.guess;
  // クライアントから来た値は信頼しない。有効かどうかはルール層が決める
  if (!isValidGuess(guess)) return c.json({ error: "0〜99の整数を選んでください" }, 400);

  return c.json(play(crypto.getRandomValues(new Uint32Array(1))[0], guess));
});

app.notFound((c) => c.json({ error: "そのAPIはありません" }, 404));

/** 最後の砦。中身はログにだけ残し、webのapiClientが読む`{error}`の形で返す */
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "サーバーでエラーが起きました" }, 500);
});

export default app;
