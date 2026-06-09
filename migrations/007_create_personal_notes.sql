CREATE TABLE IF NOT EXISTS PersonalNotes (
  id           INTEGER PRIMARY KEY,
  ownerUserId  INTEGER NOT NULL,
  title        TEXT    NOT NULL,
  content      TEXT    NOT NULL DEFAULT '',
  createdAt    TEXT    NOT NULL,
  updatedAt    TEXT    NOT NULL,
  deletedAt    TEXT,
  FOREIGN KEY (ownerUserId) REFERENCES Users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notes_ownerUserId ON PersonalNotes(ownerUserId);
