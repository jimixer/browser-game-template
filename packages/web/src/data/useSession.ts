import { useEffect, useState } from "react";
import { getSession, signInWithDiscord, signOut } from "./apiClient";
import type { SessionUser } from "../types";

/**
 * サインイン状態。読み込み中と未サインインを区別しないと、サインイン済みでも一瞬サインイン画面が出る。
 * `failed` は問い合わせ自体の失敗で、未サインインとは別に扱う。
 */
export type SessionState =
  | { status: "loading" }
  | { status: "failed" }
  | { status: "signedOut" }
  | { status: "signedIn"; user: SessionUser };

/**
 * ページの読み込みごとに1回だけ行う、サインイン状態の問い合わせ。すべての `useSession` が共有する。
 * サインインとサインアウトはページごと読み直すので、読み込みの途中でサインイン状態は変わらない。
 * プレイヤー名は読み直さずに変わりうるので、最新の値が要る画面は `getSession` を直接呼ぶ。
 */
let request: Promise<SessionState> | undefined;
/** `request` が解決した値。問い合わせ中ならundefined */
let resolved: SessionState | undefined;

function loadSession(): Promise<SessionState> {
  request ??= getSession().then(
    (res) => (resolved = res ? { status: "signedIn", user: res.user } : { status: "signedOut" }),
    () => (resolved = { status: "failed" }),
  );
  return request;
}

/**
 * 状態ごとに振る舞いを変える画面は `state.status` で分ける。
 * サインイン済みのユーザーだけが要る画面は `user` を見る。それ以外の状態ではすべてundefined
 */
export function useSession() {
  const [state, setState] = useState<SessionState>(resolved ?? { status: "loading" });

  useEffect(() => {
    void loadSession().then(setState);
  }, []);

  const user = state.status === "signedIn" ? state.user : undefined;
  return { state, user, signIn: signInWithDiscord, signOut };
}
