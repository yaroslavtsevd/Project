import type { BaseEntity } from "./common.model.js";

export interface UserEntity extends BaseEntity {
  name: string;
  email: string;
  role: "Student" | "Teacher" | "Admin";
}
