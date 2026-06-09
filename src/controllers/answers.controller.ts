import type { Request, Response } from "express";
import { answersService } from "../services/answers.service.js";
import { parseId } from "../utils/parseId.js";
import type {
  CreateAnswerRequestDto,
  UpdateAnswerRequestDto,
  PatchAnswerRequestDto,
} from "../dtos/answers.dto.js";

function q(req: Request): Record<string, unknown> {
  return req.query as Record<string, unknown>;
}

export async function getAnswerList(req: Request, res: Response): Promise<void> {
  res.status(200).json(await answersService.getList(q(req)));
}

export async function getAnswerById(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params["id"]);
  res.status(200).json({ data: await answersService.getById(id) });
}

export async function createAnswer(req: Request, res: Response): Promise<void> {
  const dto = req.body as CreateAnswerRequestDto;
  res.status(201).json({ data: await answersService.create(dto) });
}

export async function updateAnswer(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params["id"]);
  const dto = req.body as UpdateAnswerRequestDto;
  res.status(200).json({ data: await answersService.update(id, dto) });
}

export async function patchAnswer(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params["id"]);
  const dto = req.body as PatchAnswerRequestDto;
  res.status(200).json({ data: await answersService.patch(id, dto) });
}

export async function deleteAnswer(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params["id"]);
  await answersService.delete(id);
  res.status(204).send();
}
