CREATE TABLE IF NOT EXISTS Answers (
  id         INTEGER PRIMARY KEY,
  questionId INTEGER NOT NULL,
  userId     INTEGER NOT NULL,
  value      TEXT    NOT NULL,
  createdAt  TEXT    NOT NULL,
  updatedAt  TEXT    NOT NULL,
  deletedAt  TEXT,
  FOREIGN KEY (questionId) REFERENCES Questions(id) ON DELETE CASCADE,
  FOREIGN KEY (userId)     REFERENCES Users(id)     ON DELETE RESTRICT
);
