import type { JSX } from "react";
import { useSession } from "../data/useSession";
import Button from "./Button";

/** ヘッダー右端のサインイン状態表示。戻り値の型を書いておくと、扱っていない状態を型検査が示す */
export default function SessionControl(): JSX.Element | null {
  const { state, signIn, signOut } = useSession();

  switch (state.status) {
    case "loading":
    case "failed":
      return null;
    case "signedOut":
      return (
        <Button kind="primary" small onClick={() => void signIn()}>
          Discordでサインイン
        </Button>
      );
    case "signedIn":
      return (
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <span className="truncate">{state.user.name}</span>
          <Button small onClick={() => void signOut()}>
            サインアウト
          </Button>
        </div>
      );
  }
}
