import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireAuth } from "../middleware/requireAuth.js";
import {
  listNotes,
  getNoteSecure,
  getNoteVulnerable,
  createNoteHandler,
  updateNoteHandler,
  deleteNoteHandler,
} from "../controllers/notes.controller.js";

// ── Secure notes router ───────────────────────────────────────────────────────
export const notesRouter = Router();
notesRouter.use(asyncHandler(requireAuth));

notesRouter.get("/",      asyncHandler(listNotes));
notesRouter.post("/",     asyncHandler(createNoteHandler));
notesRouter.get("/:id",   asyncHandler(getNoteSecure));
notesRouter.put("/:id",   asyncHandler(updateNoteHandler));   // Lab 5: owner check on UPDATE
notesRouter.delete("/:id", asyncHandler(deleteNoteHandler));  // Lab 5: owner check on DELETE

// ── Vulnerable demo router (Lab 5 IDOR PoC — before state) ───────────────────
// Accessible at /api/v1/notes-vuln/:id — kept intentionally broken for report.
export const notesVulnRouter = Router();
notesVulnRouter.use(asyncHandler(requireAuth));
notesVulnRouter.get("/:id", asyncHandler(getNoteVulnerable));
