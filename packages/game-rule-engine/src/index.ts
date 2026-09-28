/** 1回のプレイの結果 */
export interface PlayResult {
  seed: number;
  score: number;
}

/** 同じseedからは常に同じ0〜99の値を返す疑似乱数(mulberry32) */
function random(seed: number): number {
  let t = (seed + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) % 100;
}

/** 1回のプレイを判定する。ゲームのルールに置き換える場所 */
export function play(seed: number): PlayResult {
  return { seed, score: random(seed) };
}
