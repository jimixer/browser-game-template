export interface SessionUser {
  id: string;
  name: string;
  image?: string | null;
}

/** 1回のプレイの結果(packages/game-rule-engine の PlayResult) */
export interface PlayResult {
  seed: number;
  score: number;
}

export interface StoredResult extends PlayResult {
  createdAt: string;
}
