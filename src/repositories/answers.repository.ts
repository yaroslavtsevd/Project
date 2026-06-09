import type { AnswerEntity } from "../models/answer.model.js";
import { all, get, run, esc } from "../db/dbClient.js";

function rowToEntity(row: Record<string, unknown>): AnswerEntity {
  let value: string | string[] = "";
  try {
    const parsed: unknown = JSON.parse(row["value"] as string);
    value = parsed as string | string[];
  } catch {
    value = row["value"] as string;
  }
  return {
    id: row["id"] as number,
    questionId: row["questionId"] as number,
    userId: row["userId"] as number,
    value,
    createdAt: row["createdAt"] as string,
    updatedAt: row["updatedAt"] as string,
    deletedAt: (row["deletedAt"] as string | null) ?? null,
  };
}

const BASE = `SELECT id, questionId, userId, value, createdAt, updatedAt, deletedAt FROM Answers`;

export async function getAllAnswers(includeDeleted = false): Promise<AnswerEntity[]> {
  const where = includeDeleted ? "" : "WHERE deletedAt IS NULL";
  const rows = await all<Record<string, unknown>>(`${BASE} ${where} ORDER BY id DESC;`);
  return rows.map(rowToEntity);
}

export async function getAnswerById(id: number, includeDeleted = false): Promise<AnswerEntity | null> {
  const dc = includeDeleted ? "" : "AND deletedAt IS NULL";
  const row = await get<Record<string, unknown>>(`${BASE} WHERE id = ${id} ${dc};`);
  return row ? rowToEntity(row) : null;
}

export async function findAnswerByQuestionAndUser(questionId: number, userId: number, includeDeleted = false): Promise<AnswerEntity | null> {
  const dc = includeDeleted ? "" : "AND deletedAt IS NULL";
  const row = await get<Record<string, unknown>>(
    `${BASE} WHERE questionId = ${questionId} AND userId = ${userId} ${dc};`
  );
  return row ? rowToEntity(row) : null;
}

export async function getAnswersByQuestionId(questionId: number, includeDeleted = false): Promise<AnswerEntity[]> {
  const dc = includeDeleted ? "" : "AND deletedAt IS NULL";
  const rows = await all<Record<string, unknown>>(
    `${BASE} WHERE questionId = ${questionId} ${dc} ORDER BY id DESC;`
  );
  return rows.map(rowToEntity);
}

export async function createAnswer(data: Omit<AnswerEntity, "id">): Promise<AnswerEntity> {
  const valueJson = JSON.stringify(data.value);
  const result = await run(`
    INSERT INTO Answers (questionId, userId, value, createdAt, updatedAt, deletedAt)
    VALUES (
      ${data.questionId},
      ${data.userId},
      '${esc(valueJson)}',
      '${esc(data.createdAt)}',
      '${esc(data.updatedAt)}',
      ${data.deletedAt === null ? "NULL" : `'${esc(data.deletedAt)}'`}
    );
  `);
  const created = await getAnswerById(result.lastID, true);
  if (!created) throw new Error("Failed to retrieve created answer");
  return created;
}

export async function replaceAnswer(id: number, data: Omit<AnswerEntity, "id" | "createdAt">): Promise<AnswerEntity | null> {
  const valueJson = JSON.stringify(data.value);
  const result = await run(`
    UPDATE Answers
    SET questionId = ${data.questionId},
        userId     = ${data.userId},
        value      = '${esc(valueJson)}',
        updatedAt  = '${esc(data.updatedAt)}',
        deletedAt  = ${data.deletedAt === null ? "NULL" : `'${esc(data.deletedAt)}'`}
    WHERE id = ${id} AND deletedAt IS NULL;
  `);
  if (result.changes === 0) return null;
  return getAnswerById(id);
}

export async function patchAnswer(id: number, data: Partial<Omit<AnswerEntity, "id" | "createdAt">>): Promise<AnswerEntity | null> {
  const current = await getAnswerById(id);
  if (!current) return null;
  const merged: Omit<AnswerEntity, "id" | "createdAt"> = {
    questionId: data.questionId ?? current.questionId,
    userId: data.userId ?? current.userId,
    value: data.value ?? current.value,
    updatedAt: data.updatedAt ?? new Date().toISOString(),
    deletedAt: "deletedAt" in data ? (data.deletedAt ?? null) : current.deletedAt,
  };
  return replaceAnswer(id, merged);
}

export async function softDeleteAnswer(id: number, deletedAt: string): Promise<AnswerEntity | null> {
  return patchAnswer(id, { deletedAt, updatedAt: deletedAt });
}

/**
 * Cascade soft-delete: marks every Answer whose questionId is in the given list.
 * Used inside a transaction when a Poll (and its Questions) is soft-deleted.
 */
export async function softDeleteAnswersByQuestionIds(
  questionIds: number[],
  deletedAt: string,
): Promise<void> {
  if (questionIds.length === 0) return;
  const ids = questionIds.join(", ");
  await run(`
    UPDATE Answers
    SET deletedAt = '${esc(deletedAt)}', updatedAt = '${esc(deletedAt)}'
    WHERE questionId IN (${ids}) AND deletedAt IS NULL;
  `);
}
