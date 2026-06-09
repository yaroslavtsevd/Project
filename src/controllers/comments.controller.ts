/**
 * Comments controller — Lab 5, Scenario B (XSS).
 *
 * Two endpoints intentionally differ in how they return data:
 *   GET /api/v1/polls/:id/comments-vuln  ← returns body as-is (used in vulnerable UI)
 *   GET /api/v1/polls/:id/comments       ← same data; safety is enforced in the frontend
 *
 * POST /api/v1/polls/:id/comments — stores a comment.
 * The XSS demonstration is in how the frontend renders the body field:
 *   - vulnerable path: innerHTML = comment.body          → XSS executes
 *   - secure path:     li.textContent = comment.body     → shown as plain text
 */

import type { Request, Response } from "express";
import { getCommentsByPoll, createComment } from "../repositories/comments.repository.js";
import type { AuthedRequest } from "../middleware/requireAuth.js";

export async function listComments(req: Request, res: Response): Promise<void> {
  const pollId = Number(req.params["pollId"]);
  if (!Number.isInteger(pollId) || pollId <= 0) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid pollId" } });
    return;
  }
  const comments = await getCommentsByPoll(pollId);
  res.status(200).json({ data: comments, meta: { count: comments.length } });
}

export async function addComment(req: Request, res: Response): Promise<void> {
  const pollId   = Number(req.params["pollId"]);
  const authorId = (req as AuthedRequest).currentUserId;
  const { body } = req.body as { body?: string };

  if (!Number.isInteger(pollId) || pollId <= 0) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid pollId" } });
    return;
  }
  if (!body || typeof body !== "string" || body.trim() === "") {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "body is required" } });
    return;
  }
  if (body.length > 1000) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "body too long (max 1000 chars)" } });
    return;
  }

  const comment = await createComment(pollId, authorId, body.trim());
  res.status(201).json({ data: comment });
}
