import type { Request, Response } from "express";
import { pollsService } from "../services/polls.service.js";
import { parseId } from "../utils/parseId.js";
import type {
  CreatePollRequestDto,
  UpdatePollRequestDto,
  PatchPollRequestDto,
} from "../dtos/polls.dto.js";

function queryToRecord(query: Request["query"]): Record<string, unknown> {
  return query as Record<string, unknown>;
}

export async function getPollList(req: Request, res: Response): Promise<void> {
  const result = await pollsService.getList(queryToRecord(req.query));
  res.status(200).json(result);
}

export async function getPollById(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params["id"]);
  const result = await pollsService.getById(id);
  res.status(200).json(result);
}

export async function createPoll(req: Request, res: Response): Promise<void> {
  const dto = req.body as CreatePollRequestDto;
  const result = await pollsService.create(dto);
  res.status(201).json(result);
}

export async function updatePoll(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params["id"]);
  const dto = req.body as UpdatePollRequestDto;
  const result = await pollsService.update(id, dto);
  res.status(200).json(result);
}

export async function patchPoll(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params["id"]);
  const dto = req.body as PatchPollRequestDto;
  const result = await pollsService.patch(id, dto);
  res.status(200).json(result);
}

export async function deletePoll(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params["id"]);
  await pollsService.delete(id);
  res.status(204).send();
}

/** GET /api/polls/stats — LEFT JOIN + GROUP BY + COUNT */
export async function getPollStats(_req: Request, res: Response): Promise<void> {
  const result = await pollsService.getStats();
  res.status(200).json({ data: result, meta: { count: result.length } });
}

/**
 * GET /api/polls/:id/with-questions
 * Returns the poll object together with its questions,
 * each enriched with an answerCount (JOIN Questions ← Answers + COUNT).
 */
export async function getPollWithQuestions(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params["id"]);
  const result = await pollsService.getWithQuestions(id);
  res.status(200).json({ data: result });
}

/** GET /api/polls/:id/questions?type=single&sortBy=order&sortDir=asc&limit=10
 * Expressive query: JOIN Questions ← Answers, filtered by type,
 * sorted by chosen column, limited to N rows.
 */
export async function getPollQuestionsFiltered(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params["id"]);
  const result = await pollsService.getFilteredQuestions(id, req.query as Record<string, unknown>);
  res.status(200).json(result);
}

export async function searchPolls(req: Request, res: Response): Promise<void> {
  const q = typeof req.query["q"] === "string" ? req.query["q"] : "";
  const result = await pollsService.search(q);
  res.status(200).json({ data: result, meta: { count: result.length } });
}

// ── GET /api/v1/polls/search-vuln — VULNERABLE SQLi PoC (Lab 5 "before" state) ──
export async function searchPollsVulnerable(req: Request, res: Response): Promise<void> {
  const q = String(req.query["q"] ?? "");
  // Deliberately calls the vulnerable function — kept for Lab 5 report demonstration
  const { searchPollsByTitleVulnerable } = await import("../repositories/polls.repository.js");
  const result = await searchPollsByTitleVulnerable(q);
  res.status(200).json({ data: result, meta: { count: result.length, WARNING: "VULNERABLE ENDPOINT — Lab 5 PoC only" } });
}
