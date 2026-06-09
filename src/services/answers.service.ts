import type { ListResponse } from "../models/common.model.js";
import type {
  AnswerResponseDto, CreateAnswerRequestDto, PatchAnswerRequestDto, UpdateAnswerRequestDto,
} from "../dtos/answers.dto.js";
import { toAnswerResponseDto } from "../dtos/answers.dto.js";
import { ApiError } from "../errors/ApiError.js";
import {
  getAllAnswers, getAnswerById, findAnswerByQuestionAndUser,
  createAnswer, replaceAnswer, patchAnswer, softDeleteAnswer,
} from "../repositories/answers.repository.js";
import { getQuestionById } from "../repositories/questions.repository.js";
import { getUserById } from "../repositories/users.repository.js";
import { compareValues, paginate, parseListQuery } from "../utils/listQuery.js";

export class AnswersService {
  async getList(query: Record<string, unknown>): Promise<ListResponse<AnswerResponseDto>> {
    const listQuery = parseListQuery(query);
    const questionId = typeof query.questionId === "string" ? Number(query.questionId) : undefined;
    const userId = typeof query.userId === "string" ? Number(query.userId) : undefined;
    let items = await getAllAnswers(listQuery.includeDeleted);

    if (questionId && Number.isInteger(questionId)) items = items.filter((a) => a.questionId === questionId);
    if (userId && Number.isInteger(userId)) items = items.filter((a) => a.userId === userId);
    const allowedSort = new Set(["id", "questionId", "userId", "createdAt"]);
    if (listQuery.sortBy && allowedSort.has(listQuery.sortBy)) {
      items = [...items].sort((a, b) =>
        compareValues(String(a[listQuery.sortBy as keyof typeof a]), String(b[listQuery.sortBy as keyof typeof b]), listQuery.sortDir)
      );
    }
    const total = items.length;
    const pageItems = paginate(items, listQuery.page, listQuery.pageSize).map(toAnswerResponseDto);
    return { data: pageItems, meta: { total, page: listQuery.page, pageSize: listQuery.pageSize } };
  }

  async getById(id: number): Promise<AnswerResponseDto> {
    const answer = await getAnswerById(id);
    if (!answer) throw ApiError.notFound("Answer not found");
    return toAnswerResponseDto(answer);
  }

  async create(dto: CreateAnswerRequestDto): Promise<AnswerResponseDto> {
    await this.checkRelations(dto.questionId, dto.userId);
    const duplicate = await findAnswerByQuestionAndUser(dto.questionId, dto.userId);
    if (duplicate) throw ApiError.conflict("This user has already answered this question");
    const now = new Date().toISOString();
    const answer = await createAnswer({ ...dto, createdAt: now, updatedAt: now, deletedAt: null });
    return toAnswerResponseDto(answer);
  }

  async update(id: number, dto: UpdateAnswerRequestDto): Promise<AnswerResponseDto> {
    const current = await getAnswerById(id);
    if (!current) throw ApiError.notFound("Answer not found");
    await this.checkRelations(dto.questionId, dto.userId);
    const duplicate = await findAnswerByQuestionAndUser(dto.questionId, dto.userId);
    if (duplicate && duplicate.id !== id) throw ApiError.conflict("This user has already answered this question");
    const updated = await replaceAnswer(id, { ...dto, updatedAt: new Date().toISOString(), deletedAt: null });
    if (!updated) throw ApiError.notFound("Answer not found");
    return toAnswerResponseDto(updated);
  }

  async patch(id: number, dto: PatchAnswerRequestDto): Promise<AnswerResponseDto> {
    const current = await getAnswerById(id);
    if (!current) throw ApiError.notFound("Answer not found");
    const nextQuestionId = dto.questionId ?? current.questionId;
    const nextUserId = dto.userId ?? current.userId;
    await this.checkRelations(nextQuestionId, nextUserId);
    const duplicate = await findAnswerByQuestionAndUser(nextQuestionId, nextUserId);
    if (duplicate && duplicate.id !== id) throw ApiError.conflict("This user has already answered this question");
    const updated = await patchAnswer(id, { ...dto, updatedAt: new Date().toISOString() });
    if (!updated) throw ApiError.notFound("Answer not found");
    return toAnswerResponseDto(updated);
  }

  async delete(id: number): Promise<void> {
    const answer = await getAnswerById(id);
    if (!answer) throw ApiError.notFound("Answer not found");
    await softDeleteAnswer(id, new Date().toISOString());
  }

  private async checkRelations(questionId: number, userId: number): Promise<void> {
    if (!(await getQuestionById(questionId))) {
      throw ApiError.badRequest("Invalid request body", [{ field: "questionId", message: "Question does not exist" }]);
    }
    if (!(await getUserById(userId))) {
      throw ApiError.badRequest("Invalid request body", [{ field: "userId", message: "User does not exist" }]);
    }
  }
}

export const answersService = new AnswersService();
