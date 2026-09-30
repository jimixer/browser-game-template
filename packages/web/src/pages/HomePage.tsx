import { useEffect, useState, type FormEvent } from "react";
import Button from "../components/Button";
import { listResults, play } from "../data/apiClient";
import { useSession } from "../data/useSession";
import type { PlayResult, StoredResult } from "../types";

export default function HomePage() {
  const { user, loading, failed } = useSession();
  const [guess, setGuess] = useState("50");
  const [last, setLast] = useState<PlayResult>();
  const [results, setResults] = useState<StoredResult[]>([]);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (user) listResults().then(setResults, (e: Error) => setError(e.message));
  }, [user]);

  if (loading) return null;
  if (failed) return <p className="text-danger">サーバーに接続できません。apiが動いているか確認してください。</p>;

  async function onPlay(e: FormEvent) {
    e.preventDefault();
    setError(undefined);
    try {
      // 入力の検証はサーバーが行う。空欄はNumber("")で0にならないよう、NaN(JSONではnull)にして弾かせる
      setLast(await play(guess === "" ? NaN : Number(guess)));
      if (user) setResults(await listResults());
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
      {user ? (
        <>
          <h2>最近の結果</h2>
          <ul>
            {results.map((r) => (
              <li key={r.id}>
                {new Date(r.createdAt).toLocaleString()} — {r.guess}を選んで{r.score}点
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-fg-muted">サインインすると結果が残ります。</p>
      )}
    </div>
  );
}
