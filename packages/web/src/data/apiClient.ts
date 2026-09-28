// APIを呼び出すクライアント。同一オリジンの`/api`配下に置かれる。
import type { PlayResult, SessionUser, StoredResult } from "../types";

const BASE_URL = "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    // APIは弾いた理由を{error}で返す
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `API error ${res.status}: ${path}`);
  }
  return res.json();
}

export async function play(): Promise<PlayResult> {
  return request("/results", { method: "POST" });
}

export async function listResults(): Promise<StoredResult[]> {
  return request("/results");
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
  await request("/auth/sign-out", { method: "POST" });
  window.location.href = "/";
}
