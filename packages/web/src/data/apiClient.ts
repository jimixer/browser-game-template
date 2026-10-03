// APIを呼び出すクライアント。同一オリジンの`/api`配下に置かれる。
import type { GameView } from "game-rule-engine";
import type { SessionUser } from "../types";

const BASE_URL = "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  // 呼び出し側がヘッダーを渡しても、既定のContent-Typeを落とさない
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, { signal: AbortSignal.timeout(10_000), ...init, headers });
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

/** 新しいゲームを始める。続きは`id`で引く */
export async function createGame(): Promise<GameView & { id: string }> {
  return request("/games", { method: "POST" });
}

export async function getGame(id: string): Promise<GameView> {
  return request(`/games/${encodeURIComponent(id)}`);
}

/** 勝ったときにサインインしていれば、更新後の自己ベストが`best`に入る */
export async function guess(id: string, n: number): Promise<GameView & { best?: number }> {
  return request(`/games/${encodeURIComponent(id)}/guesses`, { method: "POST", body: JSON.stringify({ guess: n }) });
}

/** 自分の自己ベスト。サインインが必要。まだ遊んでいなければnull */
export async function getBest(): Promise<number | null> {
  const { best } = await request<{ best: number | null }>("/best");
  return best;
}

/** 未サインインならnull */
export async function getSession(): Promise<{ user: SessionUser } | null> {
  return request("/auth/get-session");
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
