import { useEffect, useState } from "react";
import Button from "../components/Button";
import { listResults, play } from "../data/apiClient";
import { useSession } from "../data/useSession";
import type { StoredResult } from "../types";

export default function HomePage() {
  const { user, loading } = useSession();
  const [results, setResults] = useState<StoredResult[]>([]);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (user) listResults().then(setResults, (e: Error) => setError(e.message));
  }, [user]);

  if (loading) return null;
  if (!user) return <p>サインインすると遊べます。</p>;

  async function onPlay() {
    setError(undefined);
    try {
      await play();
      setResults(await listResults());
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div>
      <Button kind="primary" onClick={() => void onPlay()}>
        遊ぶ
      </Button>
      {error && <p className="text-danger">{error}</p>}
      <h2>最近の結果</h2>
      <ul>
        {results.map((r) => (
          <li key={r.id}>
            {new Date(r.createdAt).toLocaleString()} — {r.score}点
          </li>
        ))}
      </ul>
    </div>
  );
}
