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
