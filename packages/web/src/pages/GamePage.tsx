import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import type { GameView, Hint } from "game-rule-engine";
import Button from "../components/Button";
import NewGameButton from "../components/NewGameButton";
import { getGame, guess } from "../data/apiClient";

const hintText: Record<Hint, string> = {
  higher: "もっと大きい",
  lower: "もっと小さい",
  correct: "正解",
};

/** 1ゲームの画面。状態はサーバーにあり、URLのIDで引くので、読み直しても続きから遊べる */
export default function GamePage() {
  const { id = "" } = useParams();
  // 別のゲームへ移ったら、前のゲームの表示を引き継がないよう作り直す
  return <Game key={id} id={id} />;
}

function Game({ id }: { id: string }) {
  const [game, setGame] = useState<GameView>();
  const [input, setInput] = useState("50");
  const [error, setError] = useState<string>();
  // 返事を待つ間は送らせない。連打がそのまま2手になる
  const [pending, setPending] = useState(false);
  const [best, setBest] = useState<number>();

  useEffect(() => {
    getGame(id).then(setGame, (e: Error) => setError(e.message));
  }, [id]);

  async function onGuess(e: FormEvent) {
    e.preventDefault();
    setError(undefined);
    setPending(true);
    try {
      // 入力の検証はサーバーが行う。空欄はNumber("")で0にならないよう、NaN(JSONではnull)にして弾かせる
      const { best, ...next } = await guess(id, input === "" ? NaN : Number(input));
      setGame(next);
      setBest(best);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      {game && (
        <>
          <ol>
            {game.guesses.map((g, i) => (
              <li key={i}>
                {g.guess}: {hintText[g.hint]}
              </li>
            ))}
          </ol>
          {game.status === "playing" ? (
            <form onSubmit={(e) => void onGuess(e)} className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={99}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                aria-label="選ぶ数"
              />
              <Button kind="primary" type="submit" disabled={pending}>
                選ぶ
              </Button>
              <span className="text-sm text-fg-muted">残り{game.remaining}回</span>
            </form>
          ) : (
            <>
              <p>
                {game.status === "won" ? `${game.score}点` : "残念"}。正解は{game.answer}
              </p>
              {best !== undefined && <p>自己ベスト: {best}点</p>}
            </>
          )}
        </>
      )}
      {error && <p className="text-danger">{error}</p>}
      {(!game || game.status !== "playing") && <NewGameButton label="新しいゲーム" />}
    </div>
  );
}
