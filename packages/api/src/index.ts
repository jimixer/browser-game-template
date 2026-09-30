/**
 * アプリケーション層。Cloudflare WorkersのWorkerとして動く。
 * 判定はすべてこのサーバー側でgame-rule-engineを呼んで行う(サーバー権威)。
 */
import { httpServerHandler } from "cloudflare:node";
// httpServerHandler経由のExpressのハンドラはWorkerのenvを引数で受け取らないので、モジュールレベルのenvから取る
import { env } from "cloudflare:workers";
import express, { type ErrorRequestHandler } from "express";
import { toNodeHandler } from "better-auth/node";
import { isValidGuess, play } from "game-rule-engine";
import { auth } from "./auth.js";
import { attachUser } from "./session.js";

const app = express();

// Better Authは生のリクエスト本文を自分で読むので、express.json()より前に置く
app.all("/api/auth/*splat", (req, res) => toNodeHandler(auth())(req, res));

app.use(express.json());
app.use(attachUser);

/** すべてのエンドポイントは/api配下に置く。wrangler.jsoncのrun_worker_firstで/api/*だけがこのWorkerに届く */
const api = express.Router();
app.use("/api", api);

/** 疎通確認。deploy.shがデプロイ後に叩く。D1に届かないか、移行が当たっていなければ500になる */
api.get("/health", async (_req, res) => {
  await env.DB.prepare("SELECT 1 FROM user LIMIT 1").run();
  res.json({ ok: true });
});

/** 1回遊ぶ。判定は保存せずに返す。何をどう残すかはゲームごとに決める */
api.post("/play", (req, res) => {
  const guess: unknown = req.body?.guess;
  // クライアントから来た値は信頼しない。有効かどうかはルール層が決める
  if (!isValidGuess(guess)) return res.status(400).json({ error: "0〜99の整数を選んでください" });

  res.json(play(crypto.getRandomValues(new Uint32Array(1))[0], guess));
});

/**
 * 最後の砦。Expressの既定のハンドラはNODE_ENVがproductionでないとスタックトレースを応答に含め、
 * WorkersはNODE_ENVを設定しない。中身はログにだけ残し、webのapiClientが読む`{error}`の形で返す
 */
const onError: ErrorRequestHandler = (err, _req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: "サーバーでエラーが起きました" });
};
app.use(onError);

/** httpServerHandlerがWorkerのfetchイベントとこのポートのサーバーを繋ぐ。実際のソケットは開かない */
const PORT = 8787;
app.listen(PORT);
export default httpServerHandler({ port: PORT });
