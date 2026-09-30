import { useState, type FormEvent } from "react";
import Button from "../components/Button";
import { play } from "../data/apiClient";
import type { PlayResult } from "../types";

export default function HomePage() {
  const [guess, setGuess] = useState("50");
  const [last, setLast] = useState<PlayResult>();
  const [error, setError] = useState<string>();

  async function onPlay(e: FormEvent) {
    e.preventDefault();
    setError(undefined);
    setLast(undefined);
    try {
      // 入力の検証はサーバーが行う。空欄はNumber("")で0にならないよう、NaN(JSONではnull)にして弾かせる
      setLast(await play(guess === "" ? NaN : Number(guess)));
    } catch (e) {
      setError((e as Error).message);
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
        <Button kind="primary" type="submit">
          遊ぶ
        </Button>
      </form>
      {error && <p className="text-danger">{error}</p>}
      {last && (
        <p>
          正解は{last.answer}。{last.score}点
        </p>
      )}
    </div>
  );
}
