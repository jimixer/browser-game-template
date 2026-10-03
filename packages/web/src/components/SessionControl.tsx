import type { JSX } from "react";
import { signInWithDiscord, signOut } from "../data/apiClient";
import { useAction } from "../data/useAction";
import { useSession } from "../data/useSession";
import Button from "./Button";

/** ヘッダー右端のサインイン状態表示。戻り値の型を書いておくと、扱っていない状態を型検査が示す */
export default function SessionControl(): JSX.Element | null {
  const { state } = useSession();
  // 成功すればページごと移るので、errorが入るのは失敗したときだけ
  const { error, pending, run } = useAction();

  switch (state.status) {
    case "loading":
      return null;
    // サインインが使えなくてもゲームは遊べるので、ここで知らせるだけにする
    case "failed":
      return <span className="text-sm text-danger">サインインは使えません</span>;
    case "signedOut":
      return (
        <div className="flex min-w-0 items-center gap-2 text-sm">
          {error && <span className="text-danger">{error}</span>}
          <Button kind="primary" small disabled={pending} onClick={() => void run(signInWithDiscord)}>
            Discordでサインイン
          </Button>
        </div>
      );
    case "signedIn":
      return (
        <div className="flex min-w-0 items-center gap-2 text-sm">
          {error && <span className="text-danger">{error}</span>}
          <span className="truncate">{state.user.name}</span>
          <Button small disabled={pending} onClick={() => void run(signOut)}>
            サインアウト
          </Button>
        </div>
      );
  }
}
