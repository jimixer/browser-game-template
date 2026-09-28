import { useEffect, useState } from "react";
import { getSession, signInWithDiscord, signOut } from "./apiClient";
import type { SessionUser } from "../types";

/**
 * サインイン状態。`user`がnullなら未サインイン、undefinedならまだ問い合わせ中か、問い合わせに失敗した。
 * 読み込み中と未サインインを区別しないと、サインイン済みでも一瞬サインイン画面が出る。
 * `failed` は問い合わせ自体の失敗で、未サインインとは別に扱う。
 */
export function useSession() {
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    getSession()
      .then((res) => setUser(res?.user ?? null))
      .catch(() => setFailed(true));
  }, []);

  return { user, loading: user === undefined && !failed, failed, signIn: signInWithDiscord, signOut };
}
