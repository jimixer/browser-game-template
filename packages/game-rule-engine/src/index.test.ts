import { test } from "node:test";
import assert from "node:assert/strict";
import { applyGuess, isValidGuess, MAX_GUESSES, newGame, view } from "./index.js";

test("同じseedなら同じ正解になる", () => {
  assert.equal(newGame(42).answer, newGame(42).answer);
});

test("正解は0〜99に収まる", () => {
  for (let seed = 0; seed < 1000; seed++) {
    const { answer } = newGame(seed);
    assert.ok(answer >= 0 && answer < 100);
  }
});

test("0〜99の整数だけを入力として受け付ける", () => {
  for (const ok of [0, 99]) assert.equal(isValidGuess(ok), true, String(ok));
  for (const ng of [-1, 100, 1.5, "10", null, undefined]) assert.equal(isValidGuess(ng), false, String(ng));
});

test("正解より小さい数を選ぶと、もっと大きいと返る", () => {
  const state = { answer: 50, guesses: [] };
  const v = view(applyGuess(state, 10));
  assert.deepEqual(v.guesses, [{ guess: 10, hint: "higher" }]);
  assert.equal(v.status, "playing");
  assert.equal(v.answer, undefined, "遊んでいる間は正解を見せない");
});

test("1回目で当てると最高点", () => {
  const v = view(applyGuess({ answer: 50, guesses: [] }, 50));
  assert.equal(v.status, "won");
  assert.equal(v.score, MAX_GUESSES);
  assert.equal(v.answer, 50);
});

test("最後の1回で当てると1点", () => {
  const guesses = Array.from({ length: MAX_GUESSES - 1 }, () => 0);
  const v = view(applyGuess({ answer: 50, guesses }, 50));
  assert.equal(v.status, "won");
  assert.equal(v.score, 1);
});

test("回数を使い切ると負けで、点はない", () => {
  const guesses = Array.from({ length: MAX_GUESSES }, () => 0);
  const v = view({ answer: 50, guesses });
  assert.equal(v.status, "lost");
  assert.equal(v.score, undefined);
  assert.equal(v.answer, 50);
});

test("終わったゲームは進められない", () => {
  const won = applyGuess(newGame(42), newGame(42).answer);
  assert.throws(() => applyGuess(won, 0));
});
