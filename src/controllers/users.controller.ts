import type { Request, Response } from "express";
import { usersService } from "../services/users.service.js";
import { parseId } from "../utils/parseId.js";
import type {
  CreateUserRequestDto,
  UpdateUserRequestDto,
  PatchUserRequestDto,
} from "../dtos/users.dto.js";

function q(req: Request): Record<string, unknown> {
  return req.query as Record<string, unknown>;
}

export async function getUserList(req: Request, res: Response): Promise<void> {
  res.status(200).json(await usersService.getList(q(req)));
}

export async function getUserById(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params["id"]);
  res.status(200).json({ data: await usersService.getById(id) });
}

export async function createUser(req: Request, res: Response): Promise<void> {
  const dto = req.body as CreateUserRequestDto;
  res.status(201).json({ data: await usersService.create(dto) });
}

export async function updateUser(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params["id"]);
  const dto = req.body as UpdateUserRequestDto;
  res.status(200).json({ data: await usersService.update(id, dto) });
}

export async function patchUser(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params["id"]);
  const dto = req.body as PatchUserRequestDto;
  res.status(200).json({ data: await usersService.patch(id, dto) });
}

export async function deleteUser(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params["id"]);
  await usersService.delete(id);
  res.status(204).send();
}
