import type { ListResponse } from "../models/common.model.js";
import type {
  CreateQuestionRequestDto, PatchQuestionRequestDto, QuestionResponseDto, UpdateQuestionRequestDto,
} from "../dtos/questions.dto.js";
import { toQuestionResponseDto } from "../dtos/questions.dto.js";
import { ApiError } from "../errors/ApiError.js";
import {
  getAllQuestions, getQuestionById, getQuestionsByPollId,
  createQuestion, replaceQuestion, patchQuestion, softDeleteQuestion,
} from "../repositories/questions.repository.js";
import { getAnswersByQuestionId } from "../repositories/answers.repository.js";
import { getPollById } from "../repositories/polls.repository.js";
import { compareValues, paginate, parseListQuery } from "../utils/listQuery.js";

export class QuestionsService {
  async getList(query: Record<string, unknown>): Promise<ListResponse<QuestionResponseDto>> {
    const listQuery = parseListQuery(query);
    const pollId = typeof query.pollId === "string" ? Number(query.pollId) : undefined;
    const type = typeof query.type === "string" ? query.type : undefined;
    let items = await getAllQuestions(listQuery.includeDeleted);

    if (pollId && Number.isInteger(pollId)) items = items.filter((q) => q.pollId === pollId);
    if (type) items = items.filter((q) => q.type === type);
    if (listQuery.search) {
      const s = listQuery.search.toLowerCase();
      items = items.filter((q) => q.text.toLowerCase().includes(s));
    }
    const allowedSort = new Set(["id", "pollId", "order", "text", "type", "createdAt"]);
    if (listQuery.sortBy && allowedSort.has(listQuery.sortBy)) {
      items = [...items].sort((a, b) =>
        compareValues(String(a[listQuery.sortBy as keyof typeof a]), String(b[listQuery.sortBy as keyof typeof b]), listQuery.sortDir)
      );
    }
    const total = items.length;
    const pageItems = paginate(items, listQuery.page, listQuery.pageSize).map(toQuestionResponseDto);
    return { data: pageItems, meta: { total, page: listQuery.page, pageSize: listQuery.pageSize } };
  }

  async getById(id: number): Promise<QuestionResponseDto> {
    const question = await getQuestionById(id);
    if (!question) throw ApiError.notFound("Question not found");
    return toQuestionResponseDto(question);
  }

  async create(dto: CreateQuestionRequestDto): Promise<QuestionResponseDto> {
    const poll = await getPollById(dto.pollId);
    if (!poll) throw ApiError.badRequest("Invalid request body", [{ field: "pollId", message: "Poll does not exist" }]);
    const now = new Date().toISOString();
    const question = await createQuestion({ ...dto, createdAt: now, updatedAt: now, deletedAt: null });
    return toQuestionResponseDto(question);
  }

  async update(id: number, dto: UpdateQuestionRequestDto): Promise<QuestionResponseDto> {
    const current = await getQuestionById(id);
    if (!current) throw ApiError.notFound("Question not found");
    const poll = await getPollById(dto.pollId);
    if (!poll) throw ApiError.badRequest("Invalid request body", [{ field: "pollId", message: "Poll does not exist" }]);
    const updated = await replaceQuestion(id, { ...dto, updatedAt: new Date().toISOString(), deletedAt: null });
    if (!updated) throw ApiError.notFound("Question not found");
    return toQuestionResponseDto(updated);
  }

  async patch(id: number, dto: PatchQuestionRequestDto): Promise<QuestionResponseDto> {
    const current = await getQuestionById(id);
    if (!current) throw ApiError.notFound("Question not found");
    if (dto.pollId !== undefined) {
      const poll = await getPollById(dto.pollId);
      if (!poll) throw ApiError.badRequest("Invalid request body", [{ field: "pollId", message: "Poll does not exist" }]);
    }
    const updated = await patchQuestion(id, { ...dto, updatedAt: new Date().toISOString() });
    if (!updated) throw ApiError.notFound("Question not found");
    return toQuestionResponseDto(updated);
  }

  async delete(id: number): Promise<void> {
    const question = await getQuestionById(id);
    if (!question) throw ApiError.notFound("Question not found");
    const relatedAnswers = await getAnswersByQuestionId(id);
    if (relatedAnswers.length > 0) throw ApiError.conflict("Question cannot be deleted because it has answers. Delete related answers first");
    await softDeleteQuestion(id, new Date().toISOString());
  }

  async getByPollId(pollId: number): Promise<QuestionResponseDto[]> {
    const questions = await getQuestionsByPollId(pollId);
    return questions.map(toQuestionResponseDto);
  }
}

export const questionsService = new QuestionsService();
