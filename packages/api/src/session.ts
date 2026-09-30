/**
 * リクエストの主体を決める継ぎ目。セッションはBetter Authが管理するCookieから引く。
 * サインインが必須のハンドラは`currentUserId(req)`を、任意のハンドラは`req.userId`を見る。
 */
import type { RequestHandler, Request } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "./auth.js";

declare module "express-serve-static-core" {
  interface Request {
    userId?: string;
  }
}

/** サインインしていれば主体のユーザーIDを載せる。していなければ載せない */
export const attachUser: RequestHandler = async (req, _res, next) => {
  const session = await auth().api.getSession({ headers: fromNodeHeaders(req.headers) });
  req.userId = session?.user.id;
  next();
};

/** 自分のデータに触るルートに掛ける。未サインインを401で止める */
export const requireUser: RequestHandler = (req, res, next) => {
  if (!req.userId) return res.status(401).json({ error: "サインインが必要です" });
  next();
};

/**
 * 主体のユーザーID。`requireUser`を通ったルートでのみ呼ぶ。
 */
export function currentUserId(req: Request): string {
  const userId = req.userId;
  if (!userId) throw new Error("requireUser を通っていないルートです");
  return userId;
}
