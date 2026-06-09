CREATE TABLE IF NOT EXISTS Questions (
  id        INTEGER PRIMARY KEY,
  pollId    INTEGER NOT NULL,
  text      TEXT    NOT NULL,
  type      TEXT    NOT NULL CHECK (type IN ('single', 'multiple', 'text')),
  options   TEXT    NOT NULL DEFAULT '[]',
  "order"   INTEGER NOT NULL DEFAULT 1,
  createdAt TEXT    NOT NULL,
  updatedAt TEXT    NOT NULL,
  deletedAt TEXT,
  FOREIGN KEY (pollId) REFERENCES Polls(id) ON DELETE CASCADE
);
