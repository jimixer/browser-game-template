-- ユーザーごとの自己ベスト。ゲームのデータを残す例なので、ゲームに合わせて置き換える。
-- user_id は認証の user テーブルへ外部キーを張らない素の TEXT にする(CLAUDE.md)。

CREATE TABLE example_best_score (
  user_id TEXT PRIMARY KEY,
  score   INTEGER NOT NULL
);
