export interface SessionUser {
  id: string;
  name: string;
  image?: string | null;
}

import type { PlayResult } from "game-rule-engine";

export type { PlayResult };

export interface StoredResult extends PlayResult {
  id: string;
  createdAt: string;
}
