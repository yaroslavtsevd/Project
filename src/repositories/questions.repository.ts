import type { QuestionEntity } from "../models/question.model.js";
import { all, get, run, esc } from "../db/dbClient.js";

function rowToEntity(row: Record<string, unknown>): QuestionEntity {
  let options: string[] = [];
  try { options = JSON.parse(row["options"] as string) as string[]; } catch { options = []; }
  return {
    id: row["id"] as number,
    pollId: row["pollId"] as number,
    text: row["text"] as string,
    type: row["type"] as QuestionEntity["type"],
    options,
    order: row["order"] as number,
    createdAt: row["createdAt"] as string,
    updatedAt: row["updatedAt"] as string,
    deletedAt: (row["deletedAt"] as string | null) ?? null,
  };
}

const BASE = `SELECT id, pollId, text, type, options, "order", createdAt, updatedAt, deletedAt FROM Questions`;

export async function getAllQuestions(includeDeleted = false): Promise<QuestionEntity[]> {
  const where = includeDeleted ? "" : "WHERE deletedAt IS NULL";
  const rows = await all<Record<string, unknown>>(`${BASE} ${where} ORDER BY id DESC;`);
  return rows.map(rowToEntity);
}

export async function getQuestionById(id: number, includeDeleted = false): Promise<QuestionEntity | null> {
  const dc = includeDeleted ? "" : "AND deletedAt IS NULL";
  const row = await get<Record<string, unknown>>(`${BASE} WHERE id = ${id} ${dc};`);
  return row ? rowToEntity(row) : null;
}

export async function getQuestionsByPollId(pollId: number, includeDeleted = false): Promise<QuestionEntity[]> {
  const dc = includeDeleted ? "" : "AND deletedAt IS NULL";
  const rows = await all<Record<string, unknown>>(
    `${BASE} WHERE pollId = ${pollId} ${dc} ORDER BY "order" ASC, id ASC;`
  );
  return rows.map(rowToEntity);
}

export async function createQuestion(data: Omit<QuestionEntity, "id">): Promise<QuestionEntity> {
  const optionsJson = JSON.stringify(data.options);
  const result = await run(`
    INSERT INTO Questions (pollId, text, type, options, "order", createdAt, updatedAt, deletedAt)
    VALUES (
      ${data.pollId},
      '${esc(data.text)}',
      '${esc(data.type)}',
      '${esc(optionsJson)}',
      ${data.order},
      '${esc(data.createdAt)}',
      '${esc(data.updatedAt)}',
      ${data.deletedAt === null ? "NULL" : `'${esc(data.deletedAt)}'`}
    );
  `);
  const created = await getQuestionById(result.lastID, true);
  if (!created) throw new Error("Failed to retrieve created question");
  return created;
}

export async function replaceQuestion(id: number, data: Omit<QuestionEntity, "id" | "createdAt">): Promise<QuestionEntity | null> {
  const optionsJson = JSON.stringify(data.options);
  const result = await run(`
    UPDATE Questions
    SET pollId    = ${data.pollId},
        text      = '${esc(data.text)}',
        type      = '${esc(data.type)}',
        options   = '${esc(optionsJson)}',
        "order"   = ${data.order},
        updatedAt = '${esc(data.updatedAt)}',
        deletedAt = ${data.deletedAt === null ? "NULL" : `'${esc(data.deletedAt)}'`}
    WHERE id = ${id} AND deletedAt IS NULL;
  `);
  if (result.changes === 0) return null;
  return getQuestionById(id);
}

export async function patchQuestion(id: number, data: Partial<Omit<QuestionEntity, "id" | "createdAt">>): Promise<QuestionEntity | null> {
  const current = await getQuestionById(id);
  if (!current) return null;
  const merged: Omit<QuestionEntity, "id" | "createdAt"> = {
    pollId: data.pollId ?? current.pollId,
    text: data.text ?? current.text,
    type: data.type ?? current.type,
    options: data.options ?? current.options,
    order: data.order ?? current.order,
    updatedAt: data.updatedAt ?? new Date().toISOString(),
    deletedAt: "deletedAt" in data ? (data.deletedAt ?? null) : current.deletedAt,
  };
  return replaceQuestion(id, merged);
}

export async function softDeleteQuestion(id: number, deletedAt: string): Promise<QuestionEntity | null> {
  return patchQuestion(id, { deletedAt, updatedAt: deletedAt });
}

/**
 * Cascade soft-delete: marks every Question belonging to a given poll.
 * Used inside a transaction when a Poll is soft-deleted.
 */
export async function softDeleteQuestionsByPollId(
  pollId: number,
  deletedAt: string,
): Promise<void> {
  await run(`
    UPDATE Questions
    SET deletedAt = '${esc(deletedAt)}', updatedAt = '${esc(deletedAt)}'
    WHERE pollId = ${pollId} AND deletedAt IS NULL;
  `);
}
