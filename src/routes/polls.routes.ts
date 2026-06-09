import { Router } from "express";
import {
  createPoll,
  deletePoll,
  getPollById,
  getPollList,
  getPollStats,
  getPollWithQuestions,
  getPollQuestionsFiltered,
  patchPoll,
  searchPolls,
  searchPollsVulnerable,
  updatePoll,
} from "../controllers/polls.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validationMiddleware } from "../validation/validation.types.js";
import {
  validateCreatePoll,
  validatePatchPoll,
  validateUpdatePoll,
} from "../validation/polls.validators.js";

export const pollsRouter = Router();

// ── static sub-paths (must come BEFORE /:id to avoid routing conflicts) ───────
pollsRouter.get("/stats",       asyncHandler(getPollStats));
pollsRouter.get("/search",      asyncHandler(searchPolls));
// Lab 5 SQLi PoC: intentionally vulnerable endpoint (demonstrates "before" state)
pollsRouter.get("/search-vuln", asyncHandler(searchPollsVulnerable));

// ── collection ────────────────────────────────────────────────────────────────
pollsRouter.get("/",    asyncHandler(getPollList));
pollsRouter.post("/",   validationMiddleware(validateCreatePoll), asyncHandler(createPoll));

// ── single resource ───────────────────────────────────────────────────────────
pollsRouter.get("/:id",                asyncHandler(getPollById));
pollsRouter.put("/:id",                validationMiddleware(validateUpdatePoll), asyncHandler(updatePoll));
pollsRouter.patch("/:id",              validationMiddleware(validatePatchPoll),  asyncHandler(patchPoll));
pollsRouter.delete("/:id",             asyncHandler(deletePoll));

// ── nested — poll detail with questions + per-question answer counts (JOIN) ───
pollsRouter.get("/:id/with-questions",        asyncHandler(getPollWithQuestions));

// ── nested — expressive query: JOIN + WHERE type + ORDER BY + LIMIT ───────────
pollsRouter.get("/:id/questions",             asyncHandler(getPollQuestionsFiltered));
