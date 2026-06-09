import type { Request, Response, NextFunction } from "express";
import { validateToken } from "../services/auth.service.js";
import { getUserById } from "../repositories/users.repository.js";

export type AuthedRequest = Request & { currentUserId: number; currentUserRole: string };

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.header("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (!token) {
      res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Empty Bearer token" } });
      return;
    }
    const session = await validateToken(token);
    if (!session) {
      res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Invalid or expired token" } });
      return;
    }
    (req as AuthedRequest).currentUserId   = session.userId;
    (req as AuthedRequest).currentUserRole = session.role;
    next();
    return;
  }

  // ── 2. Fall back to X-Demo-UserId (lab demo mode) ────────────────────────
  const raw = req.header("X-Demo-UserId");
  if (raw) {
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Invalid X-Demo-UserId value" } });
      return;
    }
    const user = await getUserById(id);
    if (!user) {
      res.status(401).json({ error: { code: "UNAUTHORIZED", message: "User not found" } });
      return;
    }
    (req as AuthedRequest).currentUserId   = user.id;
    (req as AuthedRequest).currentUserRole = user.role;
    next();
    return;
  }

  // ── 3. Neither → 401 ─────────────────────────────────────────────────────
  res.status(401).json({
    error: {
      code: "UNAUTHORIZED",
      message: "Authentication required (Bearer token or X-Demo-UserId header)",
    },
  });
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const role = (req as AuthedRequest).currentUserRole;
  if (role !== "Admin") {
    res.status(403).json({ error: { code: "FORBIDDEN", message: "Admin role required" } });
    return;
  }
  next();
}
