/** 選べる数の範囲。画面の入力欄や説明文もここから作る */
export const MIN_GUESS = 0;
export const MAX_GUESS = 99;

/** 同じseedからは常に同じMIN_GUESS〜MAX_GUESSの値を返す疑似乱数(mulberry32) */
function random(seed: number): number {
  let t = (seed + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return MIN_GUESS + (((t ^ (t >>> 14)) >>> 0) % (MAX_GUESS - MIN_GUESS + 1));
}

/** プレイヤーの入力として有効か。どんな入力を受け付けるかもゲームのルールなので、ここで決める */
export function isValidGuess(guess: unknown): guess is number {
  return Number.isInteger(guess) && (guess as number) >= MIN_GUESS && (guess as number) <= MAX_GUESS;
}

/** 1ゲームで選べる回数。使い切ると負け */
export const MAX_GUESSES = 10;

/**
 * 1ゲーム分の状態。サーバーだけが持つ。正解を含むので、そのままクライアントへ返さない(`view`を通す)。
 * 状態を変えるのは`applyGuess`だけで、毎回新しい値を返す。
 */
export interface GameState {
  answer: number;
  guesses: number[];
}

export type GameStatus = "playing" | "won" | "lost";

/** 正解は選んだ数より大きいか、小さいか */
export type Hint = "higher" | "lower" | "correct";

/** プレイヤーに見せてよい部分 */
export interface GameView {
  status: GameStatus;
  guesses: { guess: number; hint: Hint }[];
  /** 残りの回数 */
  remaining: number;
  /** 終わってから見せる */
  answer?: number;
  /** 勝ったときだけ。早く当てるほど高い(1〜MAX_GUESSES) */
  score?: number;
}

/** 新しいゲームを作る。正解はseedから決まる */
export function newGame(seed: number): GameState {
  return { answer: random(seed), guesses: [] };
}

export function status(state: GameState): GameStatus {
  if (state.guesses.includes(state.answer)) return "won";
  return state.guesses.length >= MAX_GUESSES ? "lost" : "playing";
}

/** 1手進める。終わったゲームに呼ぶのは呼び出し側の誤りなので例外にする。先に`status`を見ること */
export function applyGuess(state: GameState, guess: number): GameState {
  if (status(state) !== "playing") throw new Error("終わったゲームは進められない");
  return { ...state, guesses: [...state.guesses, guess] };
}

function hint(answer: number, guess: number): Hint {
  if (guess === answer) return "correct";
  return answer > guess ? "higher" : "lower";
}

export function view(state: GameState): GameView {
  const outcome = status(state);
  return {
    status: outcome,
    guesses: state.guesses.map((guess) => ({ guess, hint: hint(state.answer, guess) })),
    remaining: MAX_GUESSES - state.guesses.length,
    ...(outcome !== "playing" && { answer: state.answer }),
    ...(outcome === "won" && { score: MAX_GUESSES - state.guesses.length + 1 }),
  };
}
