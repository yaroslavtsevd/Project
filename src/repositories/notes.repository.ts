import type { NoteEntity } from "../models/note.model.js";
import { all, get, run } from "../db/dbClient.js";

function rowToEntity(row: Record<string, unknown>): NoteEntity {
  return {
    id:          row["id"]          as number,
    ownerUserId: row["ownerUserId"] as number,
    title:       row["title"]       as string,
    content:     row["content"]     as string,
    createdAt:   row["createdAt"]   as string,
    updatedAt:   row["updatedAt"]   as string,
    deletedAt:   (row["deletedAt"]  as string | null) ?? null,
  };
}

const BASE = `SELECT id, ownerUserId, title, content, createdAt, updatedAt, deletedAt FROM PersonalNotes`;

// ── List notes belonging to a user ───────────────────────────────────────────
export async function getNotesByOwner(ownerUserId: number): Promise<NoteEntity[]> {
  const rows = await all<Record<string, unknown>>(
    `${BASE} WHERE ownerUserId = ? AND deletedAt IS NULL ORDER BY id DESC;`,
    [ownerUserId],
  );
  return rows.map(rowToEntity);
}

// ── Get a single note — SECURE: ownerUserId match required ───────────────────
export async function getNoteByIdSecure(id: number, ownerUserId: number): Promise<NoteEntity | null> {
  const row = await get<Record<string, unknown>>(
    `${BASE} WHERE id = ? AND ownerUserId = ? AND deletedAt IS NULL;`,
    [id, ownerUserId],
  );
  return row ? rowToEntity(row) : null;
}

// ── Get a single note — VULNERABLE (no owner check, for Lab 5 demo only) ─────
export async function getNoteByIdVulnerable(id: number): Promise<NoteEntity | null> {
  // VULNERABILITY: no ownerUserId check — any authenticated user can read any note by id.
  const row = await get<Record<string, unknown>>(
    `${BASE} WHERE id = ? AND deletedAt IS NULL;`,
    [id],
  );
  return row ? rowToEntity(row) : null;
}

// ── Create ────────────────────────────────────────────────────────────────────
export async function createNote(data: Omit<NoteEntity, "id">): Promise<NoteEntity> {
  const result = await run(
    `INSERT INTO PersonalNotes (ownerUserId, title, content, createdAt, updatedAt, deletedAt)
     VALUES (?, ?, ?, ?, ?, NULL);`,
    [data.ownerUserId, data.title, data.content, data.createdAt, data.updatedAt],
  );
  const created = await getNoteByIdSecure(result.lastID, data.ownerUserId);
  if (!created) throw new Error("Failed to retrieve created note");
  return created;
}

// ── Update (owner-only) ───────────────────────────────────────────────────────
export async function updateNoteSecure(
  id: number,
  ownerUserId: number,
  title: string,
  content: string,
): Promise<NoteEntity | null> {
  const now = new Date().toISOString();
  const result = await run(
    `UPDATE PersonalNotes SET title = ?, content = ?, updatedAt = ?
     WHERE id = ? AND ownerUserId = ? AND deletedAt IS NULL;`,
    [title, content, now, id, ownerUserId],
  );
  if (result.changes === 0) return null;
  return getNoteByIdSecure(id, ownerUserId);
}

// ── Soft-delete (owner-only) ──────────────────────────────────────────────────
export async function deleteNoteSecure(id: number, ownerUserId: number): Promise<boolean> {
  const now = new Date().toISOString();
  const result = await run(
    `UPDATE PersonalNotes SET deletedAt = ?, updatedAt = ?
     WHERE id = ? AND ownerUserId = ? AND deletedAt IS NULL;`,
    [now, now, id, ownerUserId],
  );
  return result.changes > 0;
}
