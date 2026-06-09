import type { BaseEntity } from "./common.model.js";

export type PollVisibility = "Public" | "Private";

export interface PollEntity extends BaseEntity {
  title: string;
  author: string;
  endDate: string;
  visibility: PollVisibility;
  description: string;
}
