/**
 * アプリケーション層。Cloudflare WorkersのWorkerとして動く。
 * 認証・疎通確認・エラー応答の配線を置く。ゲームのルートは games.ts にある。
 */
import { Hono } from "hono";
import { auth, discordCredentials } from "./auth.js";
import games from "./games.js";
import { attachUser, type AppEnv } from "./session.js";

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

// 例のゲームのルート。ゲームを置き換えるときは games.ts を差し替える
app.route("/", games);

app.notFound((c) => c.json({ error: "そのAPIはありません。URLとメソッドを確かめてください" }, 404));

/** 最後の砦。中身はログにだけ残し、webのapiClientが読む`{error}`の形で返す */
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "サーバーでエラーが起きました。しばらくしてからもう一度お試しください" }, 500);
});

export default app;
