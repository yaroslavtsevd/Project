import type { ListResponse } from "../models/common.model.js";
import type {
  CreatePollRequestDto,
  PatchPollRequestDto,
  PollResponseDto,
  UpdatePollRequestDto,
} from "../dtos/polls.dto.js";
import { toPollResponseDto } from "../dtos/polls.dto.js";
import { ApiError } from "../errors/ApiError.js";
import {
  getAllPolls,
  getPollById,
  findPollByTitleAndAuthor,
  createPoll,
  replacePoll,
  patchPoll,
  softDeletePoll,
  getPollsWithQuestionCount,
  getPollWithQuestions,
  getPollQuestionsFiltered,
  searchPollsByTitle,
} from "../repositories/polls.repository.js";
import type {
  PollWithQuestions,
  PollWithStats,
  QuestionFilter,
} from "../repositories/polls.repository.js";
import { getQuestionsByPollId, softDeleteQuestionsByPollId } from "../repositories/questions.repository.js";
import { softDeleteAnswersByQuestionIds } from "../repositories/answers.repository.js";
import { transaction } from "../db/dbClient.js";
import { compareValues, paginate, parseListQuery } from "../utils/listQuery.js";

export class PollsService {
  async getList(query: Record<string, unknown>): Promise<ListResponse<PollResponseDto>> {
    const listQuery = parseListQuery(query);
    const visibility = typeof query["visibility"] === "string" ? query["visibility"] : undefined;

    let items = await getAllPolls(listQuery.includeDeleted);

    if (visibility) items = items.filter((p) => p.visibility === visibility);
    if (listQuery.search) {
      const s = listQuery.search.toLowerCase();
      items = items.filter(
        (p) => p.title.toLowerCase().includes(s) || p.author.toLowerCase().includes(s),
      );
    }

    const allowedSort = new Set(["id", "title", "author", "endDate", "visibility", "createdAt"]);
    if (listQuery.sortBy && allowedSort.has(listQuery.sortBy)) {
      items = [...items].sort((a, b) =>
        compareValues(
          String(a[listQuery.sortBy as keyof typeof a]),
          String(b[listQuery.sortBy as keyof typeof b]),
          listQuery.sortDir,
        ),
      );
    }

    const total = items.length;
    const pageItems = paginate(items, listQuery.page, listQuery.pageSize).map(toPollResponseDto);
    return { data: pageItems, meta: { total, page: listQuery.page, pageSize: listQuery.pageSize } };
  }

  async getById(id: number): Promise<PollResponseDto> {
    const poll = await getPollById(id);
    if (!poll) throw ApiError.notFound("Poll not found");
    return toPollResponseDto(poll);
  }

  async create(dto: CreatePollRequestDto): Promise<PollResponseDto> {
    const exists = await findPollByTitleAndAuthor(dto.title, dto.author, true);
    if (exists && exists.deletedAt === null)
      throw ApiError.conflict("Poll with this title and author already exists");
    const now = new Date().toISOString();
    const poll = await createPoll({
      ...dto,
      description: dto.description ?? "",
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
    return toPollResponseDto(poll);
  }

  async update(id: number, dto: UpdatePollRequestDto): Promise<PollResponseDto> {
    const current = await getPollById(id);
    if (!current) throw ApiError.notFound("Poll not found");
    const duplicate = await findPollByTitleAndAuthor(dto.title, dto.author);
    if (duplicate && duplicate.id !== id)
      throw ApiError.conflict("Poll with this title and author already exists");
    const updated = await replacePoll(id, {
      ...dto,
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    });
    if (!updated) throw ApiError.notFound("Poll not found");
    return toPollResponseDto(updated);
  }

  async patch(id: number, dto: PatchPollRequestDto): Promise<PollResponseDto> {
    const current = await getPollById(id);
    if (!current) throw ApiError.notFound("Poll not found");
    const nextTitle = dto.title ?? current.title;
    const nextAuthor = dto.author ?? current.author;
    const duplicate = await findPollByTitleAndAuthor(nextTitle, nextAuthor);
    if (duplicate && duplicate.id !== id)
      throw ApiError.conflict("Poll with this title and author already exists");
    const updated = await patchPoll(id, { ...dto, updatedAt: new Date().toISOString() });
    if (!updated) throw ApiError.notFound("Poll not found");
    return toPollResponseDto(updated);
  }

  /**
   * Cascade soft-delete: Poll → its Questions → their Answers.
   *
   * All three UPDATE statements run inside a single SQLite transaction (BEGIN/COMMIT).
   * If any step fails, ROLLBACK ensures no partial state is written — the poll and all
   * its questions remain intact.
   *
   * Step order matters because of FK constraints:
   *   1. Collect live question IDs (read-only — outside tx is fine)
   *   2. BEGIN TRANSACTION
   *   3. Soft-delete Answers WHERE questionId IN (...)
   *   4. Soft-delete Questions WHERE pollId = id
   *   5. Soft-delete Poll WHERE id = id
   *   6. COMMIT
   */
  async delete(id: number): Promise<void> {
    const poll = await getPollById(id);
    if (!poll) throw ApiError.notFound("Poll not found");

    const now = new Date().toISOString();

    // Collect question IDs before the transaction (pure read, safe outside tx)
    const questions = await getQuestionsByPollId(id);
    const questionIds = questions.map((q) => q.id);

    await transaction([
      () => softDeleteAnswersByQuestionIds(questionIds, now),
      () => softDeleteQuestionsByPollId(id, now),
      () => softDeletePoll(id, now).then(() => undefined),
    ]);

    console.log(
      `[DB] Cascade soft-delete: Poll #${id} + ${questionIds.length} question(s) + their answers — committed.`,
    );
  }

  // ── extra endpoints ─────────────────────────────────────────────────────────

  async getFilteredQuestions(id: number, query: Record<string, unknown>): Promise<unknown> {
    const poll = await getPollById(id);
    if (!poll) throw ApiError.notFound("Poll not found");

    const filter: QuestionFilter = {};
    if (typeof query["type"] === "string") filter.type = query["type"];
    if (typeof query["sortBy"] === "string") filter.sortBy = query["sortBy"];
    if (typeof query["sortDir"] === "string") filter.sortDir = query["sortDir"];
    if (typeof query["limit"] === "string") filter.limit = Number(query["limit"]);

    const questions = await getPollQuestionsFiltered(id, filter);
    return {
      data: { poll: toPollResponseDto(poll), questions },
      meta: { pollId: id, count: questions.length, filter },
    };
  }

  async getStats(): Promise<PollWithStats[]> {
    return getPollsWithQuestionCount();
  }

  async getWithQuestions(id: number): Promise<PollWithQuestions> {
    const result = await getPollWithQuestions(id);
    if (!result) throw ApiError.notFound("Poll not found");
    return result;
  }

  async search(q: string): Promise<PollResponseDto[]> {
    const polls = await searchPollsByTitle(q);
    return polls.map(toPollResponseDto);
  }
}

export const pollsService = new PollsService();
