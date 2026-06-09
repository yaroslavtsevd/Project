CREATE TABLE IF NOT EXISTS Users (
  id        INTEGER PRIMARY KEY,
  name      TEXT    NOT NULL,
  email     TEXT    NOT NULL UNIQUE,
  role      TEXT    NOT NULL CHECK (role IN ('Student', 'Teacher', 'Admin')),
  createdAt TEXT    NOT NULL,
  updatedAt TEXT    NOT NULL,
  deletedAt TEXT
);
