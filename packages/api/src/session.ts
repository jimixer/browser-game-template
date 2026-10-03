/**
 * リクエストの主体を決める継ぎ目。セッションはBetter Authが管理するCookieから引く。
 * サインインが必須のハンドラは`currentUserId(c)`を、任意のハンドラは`c.get("userId")`を見る。
 */
import type { Context } from "hono";
import { createMiddleware } from "hono/factory";
import { auth } from "./auth.js";

/** Workerのアプリ全体の型。ハンドラとミドルウェアが同じものを使う */
export type AppEnv = { Bindings: Env; Variables: { userId?: string } };

/** サインインしていれば主体のユーザーIDを載せる。していなければ載せない */
export const attachUser = createMiddleware<AppEnv>(async (c, next) => {
  const session = await auth().api.getSession({ headers: c.req.raw.headers });
  c.set("userId", session?.user.id);
  await next();
});

/** 自分のデータに触るルートに掛ける。未サインインを401で止める */
export const requireUser = createMiddleware<AppEnv>(async (c, next) => {
  if (!c.get("userId")) return c.json({ error: "サインインしてから、もう一度お試しください" }, 401);
  await next();
});

/**
 * 主体のユーザーID。`requireUser`を通ったルートでのみ呼ぶ。
 */
export function currentUserId(c: Context<AppEnv>): string {
  const userId = c.get("userId");
  if (!userId) throw new Error("requireUser を通っていないルートです");
  return userId;
}
