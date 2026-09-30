-- プレイの結果。user_id は認証テーブルへ外部キーを張らない素の TEXT にしておく
-- (認証テーブルを別のデータベースへ切り出せるようにするため)
CREATE TABLE results (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  -- seedとguessが残っていれば、あとから判定をサーバーで再現して検証できる
  seed       INTEGER NOT NULL,
  guess      INTEGER NOT NULL,
  score      INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_results_user ON results (user_id, created_at DESC);
