import { useEffect, useState } from "react";
import { MAX_GUESSES } from "game-rule-engine";
import NewGameButton from "../components/NewGameButton";
import { getBest } from "../data/apiClient";
import { useSession } from "../data/useSession";

export default function HomePage() {
  const { user } = useSession();
  const [error, setError] = useState<string>();
  // 自己ベストはサインインしているときだけ。ゲストの記録は残さない
  const [best, setBest] = useState<number | null>();

  useEffect(() => {
    if (!user) return;
    getBest().then(setBest, (e: Error) => setError(e.message));
  }, [user]);

  return (
    <div>
      <p>
        0〜99のどれか1つを、{MAX_GUESSES}回までに当ててください。外れると、正解がもっと大きいか小さいかがわかります。早く当てるほど点が高くなります。
      </p>
      <NewGameButton />
      {error && <p className="text-danger">{error}</p>}
      {best != null && <p>自己ベスト: {best}点</p>}
    </div>
  );
}
