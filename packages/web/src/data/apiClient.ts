// APIを呼び出すクライアント。同一オリジンの`/api`配下に置かれる。
import type { PlayResult, SessionUser } from "../types";

const BASE_URL = "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(10_000),
      ...init,
    });
  } catch (e) {
    console.error(e);
    throw new Error(
      e instanceof DOMException && e.name === "TimeoutError"
        ? "応答がありませんでした。しばらくしてからもう一度お試しください"
        : "サーバーに接続できませんでした。通信状況を確かめて、もう一度お試しください",
    );
  }
  if (!res.ok) {
    // apiは原因を利用者に見せる文として{error}に書く(CLAUDE.md)。{error}がないのは、apiの手前で返った応答か/api/auth/*
    const body = await res.json().catch(() => null);
    if (body?.error) throw new Error(body.error);
    console.error(`API error ${res.status}: ${path}`);
    throw new Error(
      res.status >= 500
        ? "サーバーで問題が起きています。しばらくしてからもう一度お試しください"
        : "リクエストを受け付けられませんでした",
    );
  }
  return res.json();
}

export async function play(guess: number): Promise<PlayResult> {
  return request("/play", { method: "POST", body: JSON.stringify({ guess }) });
}

/** 未サインインならnull */
export async function getSession(): Promise<{ user: SessionUser } | null> {
  const res = await fetch(`${BASE_URL}/auth/get-session`);
  if (!res.ok) throw new Error(`API error ${res.status}: /auth/get-session`);
  return res.json();
}

/** Discordの認可画面へ送る。Better Authが飛ばし先のURLを組み立てる */
export async function signInWithDiscord(): Promise<void> {
  const { url } = await request<{ url: string }>("/auth/sign-in/social", {
    method: "POST",
    body: JSON.stringify({ provider: "discord", callbackURL: window.location.pathname }),
  });
  window.location.href = url;
}

export async function signOut(): Promise<void> {
  // Better AuthはPOSTにJSONの本文を求める。空の本文は不正なJSONとして400で弾く
  await request("/auth/sign-out", { method: "POST", body: "{}" });
  window.location.href = "/";
}
