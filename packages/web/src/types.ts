export interface SessionUser {
  id: string;
  name: string;
  image?: string | null;
}

import type { PlayResult } from "game-rule-engine";

export type { PlayResult };

/** サインイン中に残した結果。正解はseedから決まるので保存しない */
export interface StoredResult {
  id: string;
  seed: number;
  guess: number;
  score: number;
  createdAt: string;
}
