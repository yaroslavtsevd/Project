import type { Request, Response } from "express";
import { questionsService } from "../services/questions.service.js";
import { parseId } from "../utils/parseId.js";
import type {
  CreateQuestionRequestDto,
  UpdateQuestionRequestDto,
  PatchQuestionRequestDto,
} from "../dtos/questions.dto.js";

function q(req: Request): Record<string, unknown> {
  return req.query as Record<string, unknown>;
}

export async function getQuestionList(req: Request, res: Response): Promise<void> {
  res.status(200).json(await questionsService.getList(q(req)));
}

export async function getQuestionById(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params["id"]);
  res.status(200).json({ data: await questionsService.getById(id) });
}

export async function createQuestion(req: Request, res: Response): Promise<void> {
  const dto = req.body as CreateQuestionRequestDto;
  res.status(201).json({ data: await questionsService.create(dto) });
}

export async function updateQuestion(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params["id"]);
  const dto = req.body as UpdateQuestionRequestDto;
  res.status(200).json({ data: await questionsService.update(id, dto) });
}

export async function patchQuestion(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params["id"]);
  const dto = req.body as PatchQuestionRequestDto;
  res.status(200).json({ data: await questionsService.patch(id, dto) });
}

export async function deleteQuestion(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params["id"]);
  await questionsService.delete(id);
  res.status(204).send();
}
