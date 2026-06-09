import type { QuestionEntity, QuestionType } from "../models/question.model.js";

export interface CreateQuestionRequestDto {
  pollId: number;
  text: string;
  type: QuestionType;
  options: string[];
  order: number;
}

export interface UpdateQuestionRequestDto {
  pollId: number;
  text: string;
  type: QuestionType;
  options: string[];
  order: number;
}

export interface PatchQuestionRequestDto {
  pollId?: number;
  text?: string;
  type?: QuestionType;
  options?: string[];
  order?: number;
}

export interface QuestionResponseDto {
  id: number;
  pollId: number;
  text: string;
  type: QuestionType;
  options: string[];
  order: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export function toQuestionResponseDto(question: QuestionEntity): QuestionResponseDto {
  return {
    id: question.id,
    pollId: question.pollId,
    text: question.text,
    type: question.type,
    options: question.options,
    order: question.order,
    createdAt: question.createdAt,
    updatedAt: question.updatedAt,
    deletedAt: question.deletedAt,
  };
}
