import type { Request, Response } from "express";
import {
  getNotesByOwner,
  getNoteByIdSecure,
  getNoteByIdVulnerable,
  createNote,
  updateNoteSecure,
  deleteNoteSecure,
} from "../repositories/notes.repository.js";
import type { AuthedRequest } from "../middleware/requireAuth.js";

function parseNoteId(raw: string | undefined, res: Response): number | null {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid note id" } });
    return null;
  }
  return id;
}

// ── GET /api/v1/notes — list own notes ────────────────────────────────────────
export async function listNotes(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthedRequest).currentUserId;
  const notes = await getNotesByOwner(userId);
  res.status(200).json({ data: notes, meta: { count: notes.length } });
}

// ── GET /api/v1/notes/:id — SECURE (checks ownerUserId) ──────────────────────
export async function getNoteSecure(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthedRequest).currentUserId;
  const id = parseNoteId(req.params["id"], res);
  if (id === null) return;
  const note = await getNoteByIdSecure(id, userId);
  if (!note) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Note not found" } });
    return;
  }
  res.status(200).json({ data: note });
}

// ── PUT /api/v1/notes/:id — SECURE update (checks ownerUserId) ───────────────
export async function updateNoteHandler(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthedRequest).currentUserId;
  const id = parseNoteId(req.params["id"], res);
  if (id === null) return;

  const { title, content } = req.body as { title?: string; content?: string };
  if (!title || typeof title !== "string" || title.trim() === "") {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "title is required" } });
    return;
  }

  const updated = await updateNoteSecure(id, userId, title.trim(), (content ?? "").trim());
  if (!updated) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Note not found" } });
    return;
  }
  res.status(200).json({ data: updated });
}

// ── GET /api/v1/notes-vuln/:id — VULNERABLE (no owner check, Lab 5 PoC) ──────
export async function getNoteVulnerable(req: Request, res: Response): Promise<void> {
  const id = parseNoteId(req.params["id"], res);
  if (id === null) return;
  const note = await getNoteByIdVulnerable(id);
  if (!note) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Note not found" } });
    return;
  }
  res.status(200).json({ data: note });
}

// ── POST /api/v1/notes ────────────────────────────────────────────────────────
export async function createNoteHandler(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthedRequest).currentUserId;
  const { title, content } = req.body as { title?: string; content?: string };
  if (!title || typeof title !== "string" || title.trim() === "") {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "title is required" } });
    return;
  }
  const now = new Date().toISOString();
  const note = await createNote({
    ownerUserId: userId,
    title: title.trim(),
    content: (content ?? "").trim(),
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });
  res.status(201).json({ data: note });
}

// ── DELETE /api/v1/notes/:id — SECURE (checks ownerUserId) ───────────────────
export async function deleteNoteHandler(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthedRequest).currentUserId;
  const id = parseNoteId(req.params["id"], res);
  if (id === null) return;
  const deleted = await deleteNoteSecure(id, userId);
  if (!deleted) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Note not found" } });
    return;
  }
  res.status(204).send();
}
