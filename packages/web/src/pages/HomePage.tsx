import { useEffect, useState, type FormEvent } from "react";
import Button from "../components/Button";
import { getBest, play } from "../data/apiClient";
import { useSession } from "../data/useSession";
import type { PlayResult } from "game-rule-engine";

export default function HomePage() {
  const { user } = useSession();
  const [guess, setGuess] = useState("50");
  const [last, setLast] = useState<PlayResult>();
  const [error, setError] = useState<string>();
  // 返事を待つ間は送らせない。状態を変える操作なら、連打がそのまま2回効く
  const [pending, setPending] = useState(false);
  // 自己ベストはサインインしているときだけ。ゲストの記録は残さない
  const [best, setBest] = useState<number | null>();

  useEffect(() => {
    if (!user) return;
    getBest().then(setBest, (e: Error) => setError(e.message));
  }, [user]);

  async function onPlay(e: FormEvent) {
    e.preventDefault();
    setError(undefined);
    setPending(true);
    try {
      // 入力の検証はサーバーが行う。空欄はNumber("")で0にならないよう、NaN(JSONではnull)にして弾かせる
      const result = await play(guess === "" ? NaN : Number(guess));
      setLast(result);
      if (result.best !== undefined) setBest(result.best);
    } catch (e) {
      setLast(undefined);
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <p>0〜99のどれかを選んでください。正解に近いほど点が高くなります。</p>
      <form onSubmit={(e) => void onPlay(e)} className="flex gap-2">
        <input
          type="number"
          min={0}
          max={99}
          value={guess}
          onChange={(e) => setGuess(e.target.value)}
          aria-label="選ぶ数"
        />
        <Button kind="primary" type="submit" disabled={pending}>
          遊ぶ
        </Button>
      </form>
      {error && <p className="text-danger">{error}</p>}
      {last && (
        <p>
          正解は{last.answer}。{last.score}点
        </p>
      )}
      {best != null && <p>自己ベスト: {best}点</p>}
    </div>
  );
}
