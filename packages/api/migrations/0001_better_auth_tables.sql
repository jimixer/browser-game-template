-- Better Auth のコアスキーマ(user / session / account / verification)。
-- 列名は better-auth の `getAuthTables()` が返す定義に合わせてキャメルケースのままにする。

CREATE TABLE user (
  id            TEXT PRIMARY KEY,
  name          TEXT    NOT NULL,
  email         TEXT    NOT NULL UNIQUE,
  emailVerified INTEGER NOT NULL,
  image         TEXT,
  createdAt     DATE    NOT NULL,
  updatedAt     DATE    NOT NULL
);

CREATE TABLE session (
  id        TEXT PRIMARY KEY,
  expiresAt DATE NOT NULL,
  token     TEXT NOT NULL UNIQUE,
  createdAt DATE NOT NULL,
  updatedAt DATE NOT NULL,
  ipAddress TEXT,
  userAgent TEXT,
  userId    TEXT NOT NULL REFERENCES user (id) ON DELETE CASCADE
);

CREATE INDEX idx_session_user ON session (userId);

CREATE TABLE account (
  id                    TEXT PRIMARY KEY,
  accountId             TEXT NOT NULL,
  providerId            TEXT NOT NULL,
  userId                TEXT NOT NULL REFERENCES user (id) ON DELETE CASCADE,
  accessToken           TEXT,
  refreshToken          TEXT,
  idToken               TEXT,
  accessTokenExpiresAt  DATE,
  refreshTokenExpiresAt DATE,
  scope                 TEXT,
  password              TEXT,
  createdAt             DATE NOT NULL,
  updatedAt             DATE NOT NULL
);

CREATE INDEX idx_account_user ON account (userId);
-- 同じプロバイダの同じアカウントが二重に紐づかないようにする。
-- ゲームを跨いで同一人物を突き合わせる鍵でもある
CREATE UNIQUE INDEX idx_account_provider ON account (providerId, accountId);

CREATE TABLE verification (
  id         TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value      TEXT NOT NULL,
  expiresAt  DATE NOT NULL,
  createdAt  DATE NOT NULL,
  updatedAt  DATE NOT NULL
);

CREATE INDEX idx_verification_identifier ON verification (identifier);
