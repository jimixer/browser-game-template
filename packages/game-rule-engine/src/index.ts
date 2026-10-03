/** 1回のプレイの結果 */
export interface PlayResult {
  seed: number;
  /** プレイヤーが選んだ数 */
  guess: number;
  /** seedから決まる正解 */
  answer: number;
  /** 正解との近さ。ぴったりなら99、最も遠ければ0 */
  score: number;
}

/** 同じseedからは常に同じ0〜99の値を返す疑似乱数(mulberry32) */
function random(seed: number): number {
  let t = (seed + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) % 100;
}

/** プレイヤーの入力として有効か。どんな入力を受け付けるかもゲームのルールなので、ここで決める */
export function isValidGuess(guess: unknown): guess is number {
  return Number.isInteger(guess) && (guess as number) >= 0 && (guess as number) <= 99;
}

/** 1回のプレイを判定する。ゲームのルールに置き換える場所 */
export function play(seed: number, guess: number): PlayResult {
  const answer = random(seed);
  return { seed, guess, answer, score: 99 - Math.abs(answer - guess) };
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
  const s = status(state);
  return {
    status: s,
    guesses: state.guesses.map((guess) => ({ guess, hint: hint(state.answer, guess) })),
    remaining: MAX_GUESSES - state.guesses.length,
    ...(s !== "playing" && { answer: state.answer }),
    ...(s === "won" && { score: MAX_GUESSES - state.guesses.length + 1 }),
  };
}
