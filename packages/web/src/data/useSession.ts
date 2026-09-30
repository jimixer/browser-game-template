import { useEffect, useState } from "react";
import { getSession, signInWithDiscord, signOut } from "./apiClient";
import type { SessionUser } from "../types";

/**
 * ページの読み込みごとに1回だけ行う、サインイン状態の問い合わせ。すべての `useSession` が共有する。
 * サインインとサインアウトはページごと読み直すので、読み込みの途中でサインイン状態は変わらない。
 * プレイヤー名は読み直さずに変わりうるので、最新の値が要る画面は `getSession` を直接呼ぶ。
 */
let request: Promise<SessionUser | null> | undefined;
/** `request` が解決した値。問い合わせ中か失敗したならundefined */
let resolved: SessionUser | null | undefined;

function loadSession(): Promise<SessionUser | null> {
  request ??= getSession().then((res) => (resolved = res?.user ?? null));
  return request;
}

/**
 * サインイン状態。`user`がnullなら未サインイン、undefinedならまだ問い合わせ中か、問い合わせに失敗した。
 * 読み込み中と未サインインを区別しないと、サインイン済みでも一瞬サインイン画面が出る。
 * `failed` は問い合わせ自体の失敗で、未サインインとは別に扱う。
 */
export function useSession() {
  const [user, setUser] = useState<SessionUser | null | undefined>(resolved);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    loadSession()
      .then(setUser)
      .catch(() => setFailed(true));
  }, []);

  return { user, loading: user === undefined && !failed, failed, signIn: signInWithDiscord, signOut };
}
