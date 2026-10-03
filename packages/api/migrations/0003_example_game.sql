-- 1ゲーム分の状態。ルール層の GameState を JSON のまま入れる。正解を含むので、そのまま返さない。
-- サインインしていなくても遊べるよう、ユーザーではなくゲームのIDで引く。
-- ponytail: 終わったゲームも消さない。行が増えて困ったら、作成日時の列を足して古いものを消す

CREATE TABLE example_game (
  id    TEXT PRIMARY KEY,
  state TEXT NOT NULL
);
