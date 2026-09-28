import { useSession } from "../data/useSession";
import Button from "./Button";

/** ヘッダー右端のサインイン状態表示 */
export default function SessionControl() {
  const { user, loading, failed, signIn, signOut } = useSession();

  if (loading || failed) return null;

  if (!user) {
    return (
      <Button kind="primary" small onClick={() => void signIn()}>
        Discordでサインイン
      </Button>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-2 text-sm">
      <span className="truncate">{user.name}</span>
      <Button small onClick={() => void signOut()}>
        サインアウト
      </Button>
    </div>
  );
}
