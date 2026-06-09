-- Lab 5: XSS demo — stored comments table
CREATE TABLE IF NOT EXISTS PollComments (
  id        INTEGER PRIMARY KEY,
  pollId    INTEGER NOT NULL,
  authorId  INTEGER NOT NULL,
  body      TEXT    NOT NULL,
  createdAt TEXT    NOT NULL,
  FOREIGN KEY (pollId)   REFERENCES Polls(id)  ON DELETE CASCADE,
  FOREIGN KEY (authorId) REFERENCES Users(id)  ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_comments_pollId ON PollComments(pollId);
