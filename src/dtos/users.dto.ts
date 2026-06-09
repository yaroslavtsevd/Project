import type { UserEntity } from "../models/user.model.js";

export interface CreateUserRequestDto {
  name: string;
  email: string;
  role: "Student" | "Teacher" | "Admin";
}

export interface UpdateUserRequestDto {
  name: string;
  email: string;
  role: "Student" | "Teacher" | "Admin";
}

export interface PatchUserRequestDto {
  name?: string;
  email?: string;
  role?: "Student" | "Teacher" | "Admin";
}

export interface UserResponseDto {
  id: number;
  name: string;
  email: string;
  role: "Student" | "Teacher" | "Admin";
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export function toUserResponseDto(user: UserEntity): UserResponseDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    deletedAt: user.deletedAt,
  };
}
