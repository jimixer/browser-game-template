/**
 * アプリケーション層。Cloudflare WorkersのWorkerとして動く。
 * 判定はすべてこのサーバー側でgame-rule-engineを呼んで行う(サーバー権威)。
 */
import { httpServerHandler } from "cloudflare:node";
// httpServerHandler経由のExpressのハンドラはWorkerのenvを引数で受け取らないので、モジュールレベルのenvから取る
import { env } from "cloudflare:workers";
import express from "express";
import { toNodeHandler } from "better-auth/node";
import { isValidGuess, play } from "game-rule-engine";
import { auth } from "./auth.js";
import { attachUser, currentUserId, requireUser } from "./session.js";

const app = express();

// Better Authは生のリクエスト本文を自分で読むので、express.json()より前に置く
app.all("/api/auth/*splat", (req, res) => toNodeHandler(auth())(req, res));

app.use(express.json());
app.use(attachUser);

/** すべてのエンドポイントは/api配下に置く。wrangler.jsoncのrun_worker_firstで/api/*だけがこのWorkerに届く */
const api = express.Router();
app.use("/api", api);

api.get("/health", (_req, res) => {
  res.json({ ok: true });
});

/** 1回遊ぶ。サインインしていなくても遊べ、サインインしていれば結果を残す */
api.post("/play", async (req, res) => {
  const guess: unknown = req.body?.guess;
  // クライアントから来た値は信頼しない。有効かどうかはルール層が決める
  if (!isValidGuess(guess)) return res.status(400).json({ error: "0〜99の整数を選んでください" });

  const result = play(crypto.getRandomValues(new Uint32Array(1))[0], guess);
  if (req.userId) {
    await env.DB
      .prepare("INSERT INTO results (id, user_id, seed, guess, score, created_at) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(crypto.randomUUID(), req.userId, result.seed, result.guess, result.score, new Date().toISOString())
      .run();
  }
  res.json(result);
});

api.use("/results", requireUser);

api.get("/results", async (req, res) => {
  const { results } = await env.DB
    .prepare("SELECT id, seed, guess, score, created_at AS createdAt FROM results WHERE user_id = ? ORDER BY created_at DESC LIMIT 20")
    .bind(currentUserId(req))
    .all();
  res.json(results);
});

/** httpServerHandlerがWorkerのfetchイベントとこのポートのサーバーを繋ぐ。実際のソケットは開かない */
const PORT = 8787;
app.listen(PORT);
export default httpServerHandler({ port: PORT });
