import { test } from "node:test";
import assert from "node:assert/strict";
import { isValidGuess, play } from "./index.js";

test("同じ入力なら同じ結果になる", () => {
  assert.deepEqual(play(42, 10), play(42, 10));
});

test("スコアは0〜99に収まる", () => {
  for (let seed = 0; seed < 1000; seed++) {
    const { score } = play(seed, seed % 100);
    assert.ok(score >= 0 && score < 100);
  }
});

test("正解なら99点", () => {
  const { answer } = play(42, 0);
  assert.equal(play(42, answer).score, 99);
});

test("0〜99の整数だけを入力として受け付ける", () => {
  for (const ok of [0, 99]) assert.equal(isValidGuess(ok), true, String(ok));
  for (const ng of [-1, 100, 1.5, "10", null, undefined]) assert.equal(isValidGuess(ng), false, String(ng));
});
