import { all, run } from "../db/dbClient.js";

export interface CommentEntity {
  id: number;
  pollId: number;
  authorId: number;
  body: string;
  createdAt: string;
}

export async function getCommentsByPoll(pollId: number): Promise<CommentEntity[]> {
  return all<CommentEntity>(
    `SELECT id, pollId, authorId, body, createdAt FROM PollComments WHERE pollId = ? ORDER BY id DESC;`,
    [pollId],
  );
}

export async function createComment(pollId: number, authorId: number, body: string): Promise<CommentEntity> {
  const now = new Date().toISOString();
  const result = await run(
    `INSERT INTO PollComments (pollId, authorId, body, createdAt) VALUES (?, ?, ?, ?);`,
    [pollId, authorId, body, now],
  );
  const rows = await all<CommentEntity>(
    `SELECT id, pollId, authorId, body, createdAt FROM PollComments WHERE id = ?;`,
    [result.lastID],
  );
  return rows[0]!;
}
