import type { Request, Response } from "express";
import { exportAllPolls, importPolls } from "../repositories/export-import.repository.js";

/**
 * GET /api/export
 * Exports all active polls with their questions and answers as a JSON document.
 * The response can be saved to a file and later re-imported via POST /api/import.
 */
export async function exportData(_req: Request, res: Response): Promise<void> {
  const payload = await exportAllPolls();
  res.setHeader("Content-Type", "application/json");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="polls-export-${new Date().toISOString().slice(0, 10)}.json"`,
  );
  res.status(200).json({ data: payload });
}

/**
 * POST /api/import
 * Imports polls (with questions and answers) from a JSON body.
 *
 * Constraints enforced:
 *   - Maximum 10 polls per request
 *   - Maximum 20 questions per poll
 *   - Polls that already exist (same title + author) are skipped
 *   - Answers reference existing Users; unknown userId rows are silently skipped
 *   - visibility must be 'Public' | 'Private'
 *   - question type must be 'single' | 'multiple' | 'text'
 *
 * The body must match the shape produced by GET /api/export.
 */
export async function importData(req: Request, res: Response): Promise<void> {
  const payload: unknown = req.body;
  if (!payload || typeof payload !== "object") {
    res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "Request body must be a JSON object", details: null },
    });
    return;
  }

  const result = await importPolls(payload);

  const hasErrors = result.errors.length > 0;
  const status = result.pollsCreated === 0 && hasErrors ? 422 : 200;

  res.status(status).json({
    data: {
      pollsCreated: result.pollsCreated,
      pollsSkipped: result.pollsSkipped,
      questionsCreated: result.questionsCreated,
      answersCreated: result.answersCreated,
    },
    meta: {
      errors: result.errors,
      hasErrors,
    },
  });
}
