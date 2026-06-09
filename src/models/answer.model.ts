import type { BaseEntity } from "./common.model.js";

export interface AnswerEntity extends BaseEntity {
  questionId: number;
  userId: number;
  value: string | string[];
}
