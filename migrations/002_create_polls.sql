CREATE TABLE IF NOT EXISTS Polls (
  id          INTEGER PRIMARY KEY,
  title       TEXT    NOT NULL,
  author      TEXT    NOT NULL,
  endDate     TEXT    NOT NULL,
  visibility  TEXT    NOT NULL CHECK (visibility IN ('Public', 'Private')),
  description TEXT    NOT NULL DEFAULT '',
  createdAt   TEXT    NOT NULL,
  updatedAt   TEXT    NOT NULL,
  deletedAt   TEXT,
  UNIQUE (title, author)
);
