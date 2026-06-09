import type { BaseEntity } from "./common.model.js";

export type QuestionType = "single" | "multiple" | "text";

export interface QuestionEntity extends BaseEntity {
  pollId: number;
  text: string;
  type: QuestionType;
  options: string[];
  order: number;
}
