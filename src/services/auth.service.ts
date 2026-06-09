import crypto from "node:crypto";
import { get, run, all } from "../db/dbClient.js";
import { ApiError } from "../errors/ApiError.js";

const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_KEYLEN     = 32;
const PBKDF2_DIGEST     = "sha256";
const TOKEN_BYTES        = 32;
const SESSION_TTL_MS     = 24 * 60 * 60 * 1000; // 24 h
const RATE_WINDOW_MS     = 1 * 60 * 1000;        // 1 min
const MAX_ATTEMPTS       = 5;

// ── Password helpers ───────────────────────────────────────────────────────────

function hashPassword(password: string, salt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST, (err, key) => {
      if (err) reject(err);
      else resolve(key.toString("hex"));
    });
  });
}

export async function createPasswordHash(password: string): Promise<{ hash: string; salt: string }> {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = await hashPassword(password, salt);
  return { hash, salt };
}

export async function verifyPassword(password: string, salt: string, storedHash: string): Promise<boolean> {
  const hash = await hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(storedHash, "hex"));
}

// ── Token helpers ─────────────────────────────────────────────────────────────

function generateToken(): string {
  return crypto.randomBytes(TOKEN_BYTES).toString("hex");
}

// ── Rate limiting ─────────────────────────────────────────────────────────────

async function checkRateLimit(email: string): Promise<void> {
  const windowStart = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
  const row = await get<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM LoginAttempts
     WHERE email = ? AND success = 0 AND attemptedAt > ?;`,
    [email.toLowerCase(), windowStart],
  );
  if ((row?.cnt ?? 0) >= MAX_ATTEMPTS) {
    throw new ApiError(429, "TOO_MANY_REQUESTS", "Забагато невдалих спроб. Спробуйте через 15 хвилин.");
  }
}

async function recordAttempt(email: string, success: boolean): Promise<void> {
  await run(
    `INSERT INTO LoginAttempts (email, attemptedAt, success) VALUES (?, ?, ?);`,
    [email.toLowerCase(), new Date().toISOString(), success ? 1 : 0],
  );
}

// ── User lookup ───────────────────────────────────────────────────────────────

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
  passwordHash: string | null;
  passwordSalt: string | null;
}

async function findUserByEmail(email: string): Promise<AuthUser | null> {
  const row = await get<AuthUser>(
    `SELECT id, name, email, role, passwordHash, passwordSalt
     FROM Users WHERE LOWER(email) = ? AND deletedAt IS NULL;`,
    [email.toLowerCase()],
  );
  return row ?? null;
}

// ── Register ──────────────────────────────────────────────────────────────────

export async function registerUser(
  name: string,
  email: string,
  password: string,
  role: "Student" | "Teacher" | "Admin" = "Student",
): Promise<{ id: number; name: string; email: string; role: string }> {
  // Check duplicate
  const existing = await findUserByEmail(email);
  if (existing) {
    throw new ApiError(409, "CONFLICT", "Користувач із таким email вже існує");
  }

  const { hash, salt } = await createPasswordHash(password);
  const now = new Date().toISOString();

  const result = await run(
    `INSERT INTO Users (name, email, role, passwordHash, passwordSalt, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?);`,
    [name, email, role, hash, salt, now, now],
  );

  return { id: result.lastID, name, email, role };
}

// ── Login ─────────────────────────────────────────────────────────────────────

export async function loginUser(
  email: string,
  password: string,
): Promise<{ token: string; user: { id: number; name: string; email: string; role: string } }> {
  await checkRateLimit(email);

  const user = await findUserByEmail(email);

  // Always do a dummy hash if user not found — prevents timing-based user enumeration
  const dummySalt = "00000000000000000000000000000000";
  const dummyHash = "0".repeat(64);

  const salt  = user?.passwordSalt ?? dummySalt;
  const stored = user?.passwordHash ?? dummyHash;
  const valid = await verifyPassword(password, salt, stored);

  if (!user || !valid) {
    await recordAttempt(email, false);
    throw new ApiError(401, "UNAUTHORIZED", "Невірні облікові дані");
  }

  if (!user.passwordHash) {
    // Seeded user without a password hash — set one now
    const { hash, salt: newSalt } = await createPasswordHash(password);
    await run(
      `UPDATE Users SET passwordHash = ?, passwordSalt = ? WHERE id = ?;`,
      [hash, newSalt, user.id],
    );
  }

  await recordAttempt(email, true);

  // Create session
  const token     = generateToken();
  const now       = new Date().toISOString();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

  await run(
    `INSERT INTO AuthSessions (userId, token, createdAt, expiresAt) VALUES (?, ?, ?, ?);`,
    [user.id, token, now, expiresAt],
  );

  return {
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  };
}

// ── Validate session token ────────────────────────────────────────────────────

export interface SessionInfo {
  userId: number;
  role: string;
}

export async function validateToken(token: string): Promise<SessionInfo | null> {
  const now = new Date().toISOString();
  const row = await get<{ userId: number; role: string }>(
    `SELECT s.userId, u.role
     FROM AuthSessions s
     JOIN Users u ON u.id = s.userId AND u.deletedAt IS NULL
     WHERE s.token = ? AND s.expiresAt > ?;`,
    [token, now],
  );
  return row ?? null;
}

export async function logoutSession(token: string): Promise<void> {
  await run(`DELETE FROM AuthSessions WHERE token = ?;`, [token]);
}

// ── List sessions (admin) ─────────────────────────────────────────────────────

export async function listUserSessions(userId: number): Promise<{ id: number; createdAt: string; expiresAt: string }[]> {
  const rows = await all<{ id: number; createdAt: string; expiresAt: string }>(
    `SELECT id, createdAt, expiresAt FROM AuthSessions WHERE userId = ? ORDER BY createdAt DESC;`,
    [userId],
  );
  return rows;
}
