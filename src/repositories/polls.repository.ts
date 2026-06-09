import type { PollEntity } from "../models/poll.model.js";
import { all, get, run, esc } from "../db/dbClient.js";

function rowToEntity(row: Record<string, unknown>): PollEntity {
  return {
    id: row["id"] as number,
    title: row["title"] as string,
    author: row["author"] as string,
    endDate: row["endDate"] as string,
    visibility: row["visibility"] as PollEntity["visibility"],
    description: (row["description"] as string) ?? "",
    createdAt: row["createdAt"] as string,
    updatedAt: row["updatedAt"] as string,
    deletedAt: (row["deletedAt"] as string | null) ?? null,
  };
}

const BASE = `SELECT id, title, author, endDate, visibility, description, createdAt, updatedAt, deletedAt FROM Polls`;

export async function getAllPolls(includeDeleted = false): Promise<PollEntity[]> {
  const where = includeDeleted ? "" : "WHERE deletedAt IS NULL";
  const rows = await all<Record<string, unknown>>(`${BASE} ${where} ORDER BY id DESC;`);
  return rows.map(rowToEntity);
}

export async function getPollById(id: number, includeDeleted = false): Promise<PollEntity | null> {
  const dc = includeDeleted ? "" : "AND deletedAt IS NULL";
  const row = await get<Record<string, unknown>>(`${BASE} WHERE id = ${id} ${dc};`);
  return row ? rowToEntity(row) : null;
}

export async function findPollByTitleAndAuthor(title: string, author: string, includeDeleted = false): Promise<PollEntity | null> {
  const dc = includeDeleted ? "" : "AND deletedAt IS NULL";
  const row = await get<Record<string, unknown>>(
    `${BASE} WHERE LOWER(title) = '${esc(title.trim().toLowerCase())}' AND LOWER(author) = '${esc(author.trim().toLowerCase())}' ${dc};`
  );
  return row ? rowToEntity(row) : null;
}

export async function createPoll(data: Omit<PollEntity, "id">): Promise<PollEntity> {
  const result = await run(`
    INSERT INTO Polls (title, author, endDate, visibility, description, createdAt, updatedAt, deletedAt)
    VALUES (
      '${esc(data.title)}',
      '${esc(data.author)}',
      '${esc(data.endDate)}',
      '${esc(data.visibility)}',
      '${esc(data.description)}',
      '${esc(data.createdAt)}',
      '${esc(data.updatedAt)}',
      ${data.deletedAt === null ? "NULL" : `'${esc(data.deletedAt)}'`}
    );
  `);
  const created = await getPollById(result.lastID, true);
  if (!created) throw new Error("Failed to retrieve created poll");
  return created;
}

export async function replacePoll(id: number, data: Omit<PollEntity, "id" | "createdAt">): Promise<PollEntity | null> {
  const result = await run(`
    UPDATE Polls
    SET title       = '${esc(data.title)}',
        author      = '${esc(data.author)}',
        endDate     = '${esc(data.endDate)}',
        visibility  = '${esc(data.visibility)}',
        description = '${esc(data.description)}',
        updatedAt   = '${esc(data.updatedAt)}',
        deletedAt   = ${data.deletedAt === null ? "NULL" : `'${esc(data.deletedAt)}'`}
    WHERE id = ${id} AND deletedAt IS NULL;
  `);
  if (result.changes === 0) return null;
  return getPollById(id);
}

export async function patchPoll(id: number, data: Partial<Omit<PollEntity, "id" | "createdAt">>): Promise<PollEntity | null> {
  const current = await getPollById(id);
  if (!current) return null;
  const merged: Omit<PollEntity, "id" | "createdAt"> = {
    title: data.title ?? current.title,
    author: data.author ?? current.author,
    endDate: data.endDate ?? current.endDate,
    visibility: data.visibility ?? current.visibility,
    description: data.description ?? current.description,
    updatedAt: data.updatedAt ?? new Date().toISOString(),
    deletedAt: "deletedAt" in data ? (data.deletedAt ?? null) : current.deletedAt,
  };
  return replacePoll(id, merged);
}

export async function softDeletePoll(id: number, deletedAt: string): Promise<PollEntity | null> {
  return patchPoll(id, { deletedAt, updatedAt: deletedAt });
}

// ── analytics endpoint: count active questions per poll ──────────────────────
export interface PollWithStats {
  id: number;
  title: string;
  author: string;
  visibility: string;
  endDate: string;
  questionCount: number;
}

export async function getPollsWithQuestionCount(): Promise<PollWithStats[]> {
  const rows = await all<Record<string, unknown>>(`
    SELECT
      p.id,
      p.title,
      p.author,
      p.visibility,
      p.endDate,
      COUNT(q.id) AS questionCount
    FROM Polls p
    LEFT JOIN Questions q ON q.pollId = p.id AND q.deletedAt IS NULL
    WHERE p.deletedAt IS NULL
    GROUP BY p.id
    ORDER BY p.id DESC;
  `);
  return rows.map((r) => ({
    id: r["id"] as number,
    title: r["title"] as string,
    author: r["author"] as string,
    visibility: r["visibility"] as string,
    endDate: r["endDate"] as string,
    questionCount: r["questionCount"] as number,
  }));
}

// ── search endpoint using LIKE — Lab 5: fixed with parameterised query ────────
export async function searchPollsByTitle(q: string): Promise<PollEntity[]> {
  // FIX (Lab 5): user input is passed as a bound parameter, NOT concatenated
  // into the SQL string.  The SQLite driver treats it as a plain data value,
  // so special characters such as ' " -- ; cannot alter the query structure.
  const sql = `
    SELECT id, title, author, endDate, visibility, description, createdAt, updatedAt, deletedAt
    FROM Polls
    WHERE title LIKE ? AND deletedAt IS NULL
    ORDER BY id DESC
    LIMIT 20;
  `;
  const rows = await all<Record<string, unknown>>(sql, [`%${q}%`]);
  return rows.map(rowToEntity);
}

// ── JOIN: poll detail with question list and per-question answer counts ────────

export interface QuestionWithAnswerCount {
  id: number;
  text: string;
  type: string;
  options: string[];
  order: number;
  answerCount: number;
}

export interface PollWithQuestions {
  id: number;
  title: string;
  author: string;
  endDate: string;
  visibility: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  questions: QuestionWithAnswerCount[];
}

export async function getPollWithQuestions(pollId: number): Promise<PollWithQuestions | null> {
  const pollRow = await get<Record<string, unknown>>(
    `SELECT id, title, author, endDate, visibility, description, createdAt, updatedAt
     FROM Polls WHERE id = ${pollId} AND deletedAt IS NULL;`,
  );
  if (!pollRow) return null;

  // JOIN Questions ← Answers with answer count per question
  const qRows = await all<Record<string, unknown>>(`
    SELECT
      q.id,
      q.text,
      q.type,
      q.options,
      q."order",
      COUNT(a.id) AS answerCount
    FROM Questions q
    LEFT JOIN Answers a ON a.questionId = q.id AND a.deletedAt IS NULL
    WHERE q.pollId = ${pollId} AND q.deletedAt IS NULL
    GROUP BY q.id
    ORDER BY q."order" ASC, q.id ASC;
  `);

  const questions: QuestionWithAnswerCount[] = qRows.map((r) => {
    let options: string[] = [];
    try { options = JSON.parse(r["options"] as string) as string[]; } catch { options = []; }
    return {
      id: r["id"] as number,
      text: r["text"] as string,
      type: r["type"] as string,
      options,
      order: r["order"] as number,
      answerCount: r["answerCount"] as number,
    };
  });

  return {
    id: pollRow["id"] as number,
    title: pollRow["title"] as string,
    author: pollRow["author"] as string,
    endDate: pollRow["endDate"] as string,
    visibility: pollRow["visibility"] as string,
    description: (pollRow["description"] as string) ?? "",
    createdAt: pollRow["createdAt"] as string,
    updatedAt: pollRow["updatedAt"] as string,
    questions,
  };
}

// ── Expressive JOIN: poll + questions filtered, sorted, limited ───────────────

export interface QuestionFilter {
  type?: string;       // 'single' | 'multiple' | 'text'
  sortBy?: string;     // 'order' | 'id' | 'createdAt'
  sortDir?: string;    // 'asc' | 'desc'
  limit?: number;      // max rows returned
}

export async function getPollQuestionsFiltered(
  pollId: number,
  filter: QuestionFilter = {},
): Promise<QuestionWithAnswerCount[]> {
  const allowedSort: Record<string, string> = {
    order: '"order"',
    id: "q.id",
    createdAt: "q.createdAt",
  };
  const sortCol = allowedSort[filter.sortBy ?? "order"] ?? '"order"';
  const sortDir = filter.sortDir === "desc" ? "DESC" : "ASC";
  const limitClause = filter.limit && filter.limit > 0 ? `LIMIT ${Math.min(filter.limit, 200)}` : "";
  const typeClause = filter.type ? `AND q.type = '${esc(filter.type)}'` : "";

  /*
   * Expressive SQL:
   *   - LEFT JOIN Answers to count responses per question
   *   - WHERE filters by poll + active records + optional type
   *   - GROUP BY aggregates answer counts
   *   - ORDER BY chosen column + direction
   *   - LIMIT caps the result set
   */
  const rows = await all<Record<string, unknown>>(`
    SELECT
      q.id,
      q.text,
      q.type,
      q.options,
      q."order",
      COUNT(a.id) AS answerCount
    FROM  Questions q
    LEFT  JOIN Answers a
          ON  a.questionId = q.id
          AND a.deletedAt  IS NULL
    WHERE q.pollId     = ${pollId}
      AND q.deletedAt  IS NULL
      ${typeClause}
    GROUP BY q.id
    ORDER BY ${sortCol} ${sortDir}
    ${limitClause};
  `);

  return rows.map((r) => {
    let options: string[] = [];
    try { options = JSON.parse(r["options"] as string) as string[]; } catch { options = []; }
    return {
      id: r["id"] as number,
      text: r["text"] as string,
      type: r["type"] as string,
      options,
      order: r["order"] as number,
      answerCount: r["answerCount"] as number,
    };
  });
}

// ── VULNERABLE search — Lab 5 SQLi PoC (before state, kept for report) ────────
// VULNERABILITY: user input is directly concatenated into the SQL string.
// An attacker can inject SQL operators to bypass filters or dump data.
export async function searchPollsByTitleVulnerable(q: string): Promise<PollEntity[]> {
  // DO NOT use this in production — this is intentionally insecure for Lab 5 demo
  const sql = `
    SELECT id, title, author, endDate, visibility, description, createdAt, updatedAt, deletedAt
    FROM Polls
    WHERE title LIKE '%${q}%' AND deletedAt IS NULL
    ORDER BY id DESC
    LIMIT 20;
  `;
  const rows = await all<Record<string, unknown>>(sql);
  return rows.map(rowToEntity);
}
