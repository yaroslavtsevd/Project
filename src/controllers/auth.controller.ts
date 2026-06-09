import type { Request, Response } from "express";
import {
  registerUser,
  loginUser,
  logoutSession,
  listUserSessions,
} from "../services/auth.service.js";
import type { AuthedRequest } from "../middleware/requireAuth.js";

// ── POST /api/v1/auth/register ────────────────────────────────────────────────
export async function register(req: Request, res: Response): Promise<void> {
  const { name, email, password, role } = req.body as {
    name?: string;
    email?: string;
    password?: string;
    role?: string;
  };

  if (!name || typeof name !== "string" || name.trim().length < 2) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "name must be at least 2 characters" } });
    return;
  }
  if (!email || typeof email !== "string" || !email.includes("@")) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Valid email is required" } });
    return;
  }
  if (!password || typeof password !== "string" || password.length < 8) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Password must be at least 8 characters" } });
    return;
  }
  const validRoles = ["Student", "Teacher", "Admin"];
  const safeRole = validRoles.includes(role ?? "") ? (role as "Student" | "Teacher" | "Admin") : "Student";

  const user = await registerUser(name.trim(), email.trim().toLowerCase(), password, safeRole);
  res.status(201).json({ data: user });
}

// ── POST /api/v1/auth/login ───────────────────────────────────────────────────
export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "email and password are required" } });
    return;
  }

  const result = await loginUser(String(email).trim().toLowerCase(), String(password));

  // Set HttpOnly cookie in addition to returning the token in body
  res.cookie("session_token", result.token, {
    httpOnly: true,
    sameSite: "strict",
    maxAge: 24 * 60 * 60 * 1000, // 24 h
    // secure: true,  // enable in production with HTTPS
  });

  res.status(200).json({ data: { token: result.token, user: result.user } });
}

// ── POST /api/v1/auth/logout ──────────────────────────────────────────────────
export async function logout(req: Request, res: Response): Promise<void> {
  // Extract token from Authorization header
  const authHeader = req.header("Authorization");
  const cookieToken = (req.cookies as Record<string, string> | undefined)?.["session_token"];
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : (cookieToken ?? "");

  if (token) {
    await logoutSession(token);
  }

  res.clearCookie("session_token");
  res.status(200).json({ data: { message: "Logged out successfully" } });
}

// ── GET /api/v1/auth/me ───────────────────────────────────────────────────────
export async function getMe(req: Request, res: Response): Promise<void> {
  const authed = req as AuthedRequest;
  res.status(200).json({
    data: {
      userId: authed.currentUserId,
      role:   authed.currentUserRole,
    },
  });
}

// ── GET /api/v1/auth/sessions ─────────────────────────────────────────────────
export async function getSessions(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthedRequest).currentUserId;
  const sessions = await listUserSessions(userId);
  res.status(200).json({ data: sessions, meta: { count: sessions.length } });
}
