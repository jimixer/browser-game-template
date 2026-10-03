/**
 * apiが返す本文の型。ハンドラは`satisfies`で照らし合わせ、webは`api/responses`から型だけを読む。
 * 応答の形を変えると、apiとwebの両方の型検査で食い違いがわかる。
 * Honoの`hc`(RPC)はアプリ全体の型をwebへ持ち込み、Better AuthやWorkerの`Env`の型までwebで解決することになるので使わない。
 */
import type { GameView } from "game-rule-engine";

/** `POST /api/games`。続きは`id`で引く。`GET /api/games/:id`はGameViewをそのまま返す */
export type CreatedGame = GameView & { id: string };

/** `POST /api/games/:id/guesses`。勝ったときにサインインしていれば、更新後の自己ベストが`best`に入る */
export type GuessResult = GameView & { best?: number };

/** `GET /api/best`。まだ遊んでいなければnull */
export type BestScore = { best: number | null };
