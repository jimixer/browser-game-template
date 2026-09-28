import { test } from "node:test";
import assert from "node:assert/strict";
import { play } from "./index.js";

test("同じseedなら同じ結果になる", () => {
  assert.deepEqual(play(42), play(42));
});

test("スコアは0〜99に収まる", () => {
  for (let seed = 0; seed < 1000; seed++) {
    const { score } = play(seed);
    assert.ok(score >= 0 && score < 100);
  }
});
