import type { UserEntity } from "../models/user.model.js";
import { all, get, run, esc } from "../db/dbClient.js";

function rowToEntity(row: Record<string, unknown>): UserEntity {
  return {
    id: row["id"] as number,
    name: row["name"] as string,
    email: row["email"] as string,
    role: row["role"] as UserEntity["role"],
    createdAt: row["createdAt"] as string,
    updatedAt: row["updatedAt"] as string,
    deletedAt: (row["deletedAt"] as string | null) ?? null,
  };
}

const BASE = `SELECT id, name, email, role, createdAt, updatedAt, deletedAt FROM Users`;

export async function getAllUsers(includeDeleted = false): Promise<UserEntity[]> {
  const where = includeDeleted ? "" : "WHERE deletedAt IS NULL";
  const rows = await all<Record<string, unknown>>(`${BASE} ${where} ORDER BY id DESC;`);
  return rows.map(rowToEntity);
}

export async function getUserById(id: number, includeDeleted = false): Promise<UserEntity | null> {
  const dc = includeDeleted ? "" : "AND deletedAt IS NULL";
  const row = await get<Record<string, unknown>>(`${BASE} WHERE id = ${id} ${dc};`);
  return row ? rowToEntity(row) : null;
}

export async function findUserByEmail(email: string, includeDeleted = false): Promise<UserEntity | null> {
  const dc = includeDeleted ? "" : "AND deletedAt IS NULL";
  const row = await get<Record<string, unknown>>(
    `${BASE} WHERE email = '${esc(email.toLowerCase())}' ${dc};`
  );
  return row ? rowToEntity(row) : null;
}

export async function createUser(data: Omit<UserEntity, "id">): Promise<UserEntity> {
  const result = await run(`
    INSERT INTO Users (name, email, role, createdAt, updatedAt, deletedAt)
    VALUES (
      '${esc(data.name)}',
      '${esc(data.email)}',
      '${esc(data.role)}',
      '${esc(data.createdAt)}',
      '${esc(data.updatedAt)}',
      ${data.deletedAt === null ? "NULL" : `'${esc(data.deletedAt)}'`}
    );
  `);
  const created = await getUserById(result.lastID, true);
  if (!created) throw new Error("Failed to retrieve created user");
  return created;
}

export async function replaceUser(id: number, data: Omit<UserEntity, "id" | "createdAt">): Promise<UserEntity | null> {
  const result = await run(`
    UPDATE Users
    SET name      = '${esc(data.name)}',
        email     = '${esc(data.email)}',
        role      = '${esc(data.role)}',
        updatedAt = '${esc(data.updatedAt)}',
        deletedAt = ${data.deletedAt === null ? "NULL" : `'${esc(data.deletedAt)}'`}
    WHERE id = ${id} AND deletedAt IS NULL;
  `);
  if (result.changes === 0) return null;
  return getUserById(id);
}

export async function patchUser(id: number, data: Partial<Omit<UserEntity, "id" | "createdAt">>): Promise<UserEntity | null> {
  const current = await getUserById(id);
  if (!current) return null;
  const merged: Omit<UserEntity, "id" | "createdAt"> = {
    name: data.name ?? current.name,
    email: data.email ?? current.email,
    role: data.role ?? current.role,
    updatedAt: data.updatedAt ?? new Date().toISOString(),
    deletedAt: "deletedAt" in data ? (data.deletedAt ?? null) : current.deletedAt,
  };
  return replaceUser(id, merged);
}

export async function softDeleteUser(id: number, deletedAt: string): Promise<UserEntity | null> {
  return patchUser(id, { deletedAt, updatedAt: deletedAt });
}
