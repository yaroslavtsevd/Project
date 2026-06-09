import type { PollEntity, PollVisibility } from "../models/poll.model.js";

export interface CreatePollRequestDto {
  title: string;
  author: string;
  endDate: string;
  visibility: PollVisibility;
  description?: string;
}

export interface UpdatePollRequestDto {
  title: string;
  author: string;
  endDate: string;
  visibility: PollVisibility;
  description: string;
}

export interface PatchPollRequestDto {
  title?: string;
  author?: string;
  endDate?: string;
  visibility?: PollVisibility;
  description?: string;
}

export interface PollResponseDto {
  id: number;
  title: string;
  author: string;
  endDate: string;
  visibility: PollVisibility;
  description: string;
  desc: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export function toPollResponseDto(poll: PollEntity): PollResponseDto {
  return {
    id: poll.id,
    title: poll.title,
    author: poll.author,
    endDate: poll.endDate,
    visibility: poll.visibility,
    description: poll.description,
    desc: poll.description,
    createdAt: poll.createdAt,
    updatedAt: poll.updatedAt,
    deletedAt: poll.deletedAt,
  };
}
