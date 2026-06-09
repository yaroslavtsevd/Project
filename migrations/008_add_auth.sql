-- Lab 5 bonus: full authentication
-- Safe ALTER TABLE via recreate pattern (SQLite does not support IF NOT EXISTS for ADD COLUMN)

-- Step 1: recreate Users with the new columns already present (noop if table already has them)
CREATE TABLE IF NOT EXISTS Users_new (
  id           INTEGER PRIMARY KEY,
  name         TEXT    NOT NULL,
  email        TEXT    NOT NULL UNIQUE,
  role         TEXT    NOT NULL CHECK (role IN ('Student', 'Teacher', 'Admin')),
  passwordHash TEXT,
  passwordSalt TEXT,
  createdAt    TEXT    NOT NULL,
  updatedAt    TEXT    NOT NULL,
  deletedAt    TEXT
);

-- Copy existing data (extra columns get NULL automatically)
INSERT OR IGNORE INTO Users_new (id, name, email, role, createdAt, updatedAt, deletedAt)
SELECT id, name, email, role, createdAt, updatedAt, deletedAt FROM Users;

-- Drop old table and rename
DROP TABLE Users;
ALTER TABLE Users_new RENAME TO Users;

-- Session tokens table
CREATE TABLE IF NOT EXISTS AuthSessions (
  id          INTEGER PRIMARY KEY,
  userId      INTEGER NOT NULL,
  token       TEXT    NOT NULL UNIQUE,
  createdAt   TEXT    NOT NULL,
  expiresAt   TEXT    NOT NULL,
  FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_token  ON AuthSessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_userId ON AuthSessions(userId);

-- Login attempts tracking (brute-force protection)
CREATE TABLE IF NOT EXISTS LoginAttempts (
  id          INTEGER PRIMARY KEY,
  email       TEXT    NOT NULL,
  attemptedAt TEXT    NOT NULL,
  success     INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_attempts_email ON LoginAttempts(email);
