import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { MAX_GUESS, MIN_GUESS, type GameView, type Hint } from "game-rule-engine";
import BestScore from "../components/BestScore";
import Button from "../components/Button";
import NewGameButton from "../components/NewGameButton";
import { getGame, submitGuess } from "../data/apiClient";
import { useAction } from "../data/useAction";

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
  // 最初は範囲の真ん中にしておく。二分探索で当てる人がそのまま送れる
  const [input, setInput] = useState(String(Math.floor((MIN_GUESS + MAX_GUESS) / 2)));
  const { error, pending, run } = useAction();
  const [best, setBest] = useState<number>();

  useEffect(() => {
    void run(async () => setGame(await getGame(id)));
  }, [id, run]);

  function onGuess(e: FormEvent) {
    e.preventDefault();
    void run(async () => {
      // 入力の検証はサーバーが行う。空欄はNumber("")で0にならないよう、NaN(JSONではnull)にして弾かせる
      const { best, ...next } = await submitGuess(id, input === "" ? NaN : Number(input));
      setGame(next);
      setBest(best);
    });
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
            <form onSubmit={onGuess} className="flex items-center gap-2">
              <input
                type="number"
                min={MIN_GUESS}
                max={MAX_GUESS}
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
              <BestScore best={best} />
            </>
          )}
        </>
      )}
      {error && <p className="text-danger">{error}</p>}
      {(!game || game.status !== "playing") && <NewGameButton label="新しいゲーム" />}
    </div>
  );
}
