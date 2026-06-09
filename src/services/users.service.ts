import type { ListResponse } from "../models/common.model.js";
import type {
  CreateUserRequestDto,
  PatchUserRequestDto,
  UpdateUserRequestDto,
  UserResponseDto,
} from "../dtos/users.dto.js";
import { toUserResponseDto } from "../dtos/users.dto.js";
import { ApiError } from "../errors/ApiError.js";
import {
  getAllUsers, getUserById, findUserByEmail,
  createUser, replaceUser, patchUser, softDeleteUser,
} from "../repositories/users.repository.js";
import { compareValues, paginate, parseListQuery } from "../utils/listQuery.js";

export class UsersService {
  async getList(query: Record<string, unknown>): Promise<ListResponse<UserResponseDto>> {
    const listQuery = parseListQuery(query);
    const role = typeof query.role === "string" ? query.role : undefined;
    let items = await getAllUsers(listQuery.includeDeleted);

    if (role) items = items.filter((u) => u.role === role);
    if (listQuery.search) {
      const s = listQuery.search.toLowerCase();
      items = items.filter((u) => u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s));
    }
    const allowedSort = new Set(["id", "name", "email", "role", "createdAt"]);
    if (listQuery.sortBy && allowedSort.has(listQuery.sortBy)) {
      items = [...items].sort((a, b) =>
        compareValues(String(a[listQuery.sortBy as keyof typeof a]), String(b[listQuery.sortBy as keyof typeof b]), listQuery.sortDir)
      );
    }
    const total = items.length;
    const pageItems = paginate(items, listQuery.page, listQuery.pageSize).map(toUserResponseDto);
    return { data: pageItems, meta: { total, page: listQuery.page, pageSize: listQuery.pageSize } };
  }

  async getById(id: number): Promise<UserResponseDto> {
    const user = await getUserById(id);
    if (!user) throw ApiError.notFound("User not found");
    return toUserResponseDto(user);
  }

  async create(dto: CreateUserRequestDto): Promise<UserResponseDto> {
    const exists = await findUserByEmail(dto.email, true);
    if (exists && exists.deletedAt === null) throw ApiError.conflict("User with this email already exists");
    const now = new Date().toISOString();
    const user = await createUser({ ...dto, email: dto.email.toLowerCase(), createdAt: now, updatedAt: now, deletedAt: null });
    return toUserResponseDto(user);
  }

  async update(id: number, dto: UpdateUserRequestDto): Promise<UserResponseDto> {
    const current = await getUserById(id);
    if (!current) throw ApiError.notFound("User not found");
    const sameEmail = await findUserByEmail(dto.email);
    if (sameEmail && sameEmail.id !== id) throw ApiError.conflict("User with this email already exists");
    const now = new Date().toISOString();
    const updated = await replaceUser(id, { ...dto, email: dto.email.toLowerCase(), updatedAt: now, deletedAt: null });
    if (!updated) throw ApiError.notFound("User not found");
    return toUserResponseDto(updated);
  }

  async patch(id: number, dto: PatchUserRequestDto): Promise<UserResponseDto> {
    const current = await getUserById(id);
    if (!current) throw ApiError.notFound("User not found");
    if (dto.email) {
      const sameEmail = await findUserByEmail(dto.email);
      if (sameEmail && sameEmail.id !== id) throw ApiError.conflict("User with this email already exists");
    }
    const patch: PatchUserRequestDto & { updatedAt: string } = { ...dto, updatedAt: new Date().toISOString() };
    if (dto.email !== undefined) patch.email = dto.email.toLowerCase();
    const updated = await patchUser(id, patch);
    if (!updated) throw ApiError.notFound("User not found");
    return toUserResponseDto(updated);
  }

  async delete(id: number): Promise<void> {
    const user = await getUserById(id);
    if (!user) throw ApiError.notFound("User not found");
    await softDeleteUser(id, new Date().toISOString());
  }
}

export const usersService = new UsersService();
