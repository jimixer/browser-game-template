import { useNavigate } from "react-router-dom";
import { createGame } from "../data/apiClient";
import { useAction } from "../data/useAction";
import Button from "./Button";

/** 新しいゲームを作り、そのゲームの画面へ移る */
export default function NewGameButton({ label = "はじめる" }: { label?: string }) {
  const navigate = useNavigate();
  const { error, pending, run } = useAction();

  function start() {
    void run(async () => {
      const { id } = await createGame();
      void navigate(`/games/${id}`);
    });
  }

  return (
    <div>
      <Button kind="primary" disabled={pending} onClick={start}>
        {label}
      </Button>
      {error && <p className="text-danger">{error}</p>}
    </div>
  );
}
