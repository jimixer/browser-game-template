import { useCallback, useState } from "react";

/**
 * apiを呼ぶ操作の、送信中と失敗の状態。失敗したらapiClientが投げた文をそのまま`error`に入れる。
 * `run`は描画ごとに変わらないので、useEffectの依存に入れてよい。
 */
export function useAction() {
  const [error, setError] = useState<string>();
  // 返事を待つ間は送らせない。連打がそのまま2回の操作になる
  const [pending, setPending] = useState(false);

  const run = useCallback(async (action: () => Promise<unknown>) => {
    setError(undefined);
    setPending(true);
    try {
      await action();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }, []);

  return { error, pending, run };
}
