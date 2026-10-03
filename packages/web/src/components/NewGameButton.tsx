import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createGame } from "../data/apiClient";
import Button from "./Button";

/** 新しいゲームを作り、そのゲームの画面へ移る */
export default function NewGameButton({ label = "はじめる" }: { label?: string }) {
  const navigate = useNavigate();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function start() {
    setError(undefined);
    setPending(true);
    try {
      const { id } = await createGame();
      void navigate(`/games/${id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <Button kind="primary" disabled={pending} onClick={() => void start()}>
        {label}
      </Button>
      {error && <p className="text-danger">{error}</p>}
    </div>
  );
}
