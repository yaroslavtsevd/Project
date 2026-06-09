import type { AnswerEntity } from "../models/answer.model.js";

export interface CreateAnswerRequestDto {
  questionId: number;
  userId: number;
  value: string | string[];
}

export interface UpdateAnswerRequestDto {
  questionId: number;
  userId: number;
  value: string | string[];
}

export interface PatchAnswerRequestDto {
  questionId?: number;
  userId?: number;
  value?: string | string[];
}

export interface AnswerResponseDto {
  id: number;
  questionId: number;
  userId: number;
  value: string | string[];
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export function toAnswerResponseDto(answer: AnswerEntity): AnswerResponseDto {
  return {
    id: answer.id,
    questionId: answer.questionId,
    userId: answer.userId,
    value: answer.value,
    createdAt: answer.createdAt,
    updatedAt: answer.updatedAt,
    deletedAt: answer.deletedAt,
  };
}
