/**
 * アプリケーション層。Cloudflare WorkersのWorkerとして動く。
 * 判定はすべてこのサーバー側でgame-rule-engineを呼んで行う(サーバー権威)。
 */
import { httpServerHandler } from "cloudflare:node";
// httpServerHandler経由のExpressのハンドラはWorkerのenvを引数で受け取らないので、モジュールレベルのenvから取る
import { env } from "cloudflare:workers";
import express from "express";
import { toNodeHandler } from "better-auth/node";
import { play } from "game-rule-engine";
import { auth } from "./auth.js";
import { attachUser, currentUserId, requireUser } from "./session.js";

const app = express();

// Better Authは生のリクエスト本文を自分で読むので、express.json()より前に置く
app.all("/api/auth/*splat", (req, res) => toNodeHandler(auth())(req, res));

app.use(express.json());
app.use(attachUser);

/** すべてのエンドポイントは/api配下に置く。Pagesはパスを書き換えずそのまま転送する */
const api = express.Router();
app.use("/api", api);

api.get("/health", (_req, res) => {
  res.json({ ok: true });
});

api.use("/results", requireUser);

api.post("/results", async (req, res) => {
  const result = play(crypto.getRandomValues(new Uint32Array(1))[0]);
  await env.DB
    .prepare("INSERT INTO results (id, user_id, seed, score, created_at) VALUES (?, ?, ?, ?, ?)")
    .bind(crypto.randomUUID(), currentUserId(req), result.seed, result.score, new Date().toISOString())
    .run();
  res.status(201).json(result);
});

api.get("/results", async (req, res) => {
  const { results } = await env.DB
    .prepare("SELECT seed, score, created_at AS createdAt FROM results WHERE user_id = ? ORDER BY created_at DESC LIMIT 20")
    .bind(currentUserId(req))
    .all();
  res.json(results);
});

/** httpServerHandlerがWorkerのfetchイベントとこのポートのサーバーを繋ぐ。実際のソケットは開かない */
const PORT = 8787;
app.listen(PORT);
export default httpServerHandler({ port: PORT });
