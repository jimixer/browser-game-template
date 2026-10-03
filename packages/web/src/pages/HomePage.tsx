import { useEffect, useState } from "react";
import { MAX_GUESS, MAX_GUESSES, MIN_GUESS } from "game-rule-engine";
import BestScore from "../components/BestScore";
import NewGameButton from "../components/NewGameButton";
import { getBest } from "../data/apiClient";
import { useAction } from "../data/useAction";
import { useSession } from "../data/useSession";

export default function HomePage() {
  const { user } = useSession();
  const { error, run } = useAction();
  // 自己ベストはサインインしているときだけ。ゲストの記録は残さない
  const [best, setBest] = useState<number | null>();

  useEffect(() => {
    if (!user) return;
    void run(async () => setBest(await getBest()));
  }, [user, run]);

  return (
    <div>
      <p>
        {MIN_GUESS}〜{MAX_GUESS}のどれか1つを、{MAX_GUESSES}回までに当ててください。外れると、正解がもっと大きいか小さいかがわかります。早く当てるほど点が高くなります。
      </p>
      <NewGameButton />
      {error && <p className="text-danger">{error}</p>}
      <BestScore best={best} />
    </div>
  );
}
