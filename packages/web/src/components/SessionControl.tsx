import { useState, type JSX } from "react";
import { useSession } from "../data/useSession";
import Button from "./Button";

/** ヘッダー右端のサインイン状態表示。戻り値の型を書いておくと、扱っていない状態を型検査が示す */
export default function SessionControl(): JSX.Element | null {
  const { state, signIn, signOut } = useSession();
  const [error, setError] = useState<string>();

  /** 成功すればページごと移るので、ここに戻るのは失敗したときだけ */
  async function attempt(action: () => Promise<void>, message: string) {
    setError(undefined);
    try {
      await action();
    } catch (e) {
      console.error(e);
      setError(message);
    }
  }

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
          <Button kind="primary" small onClick={() => void attempt(signIn, "サインインできませんでした")}>
            Discordでサインイン
          </Button>
        </div>
      );
    case "signedIn":
      return (
        <div className="flex min-w-0 items-center gap-2 text-sm">
          {error && <span className="text-danger">{error}</span>}
          <span className="truncate">{state.user.name}</span>
          <Button small onClick={() => void attempt(signOut, "サインアウトできませんでした")}>
            サインアウト
          </Button>
        </div>
      );
  }
}
