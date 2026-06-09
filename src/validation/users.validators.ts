import type {
  CreateUserRequestDto,
  PatchUserRequestDto,
  UpdateUserRequestDto,
} from "../dtos/users.dto.js";
import type { Validator } from "./validation.types.js";
import type { ErrorDetail } from "../errors/ApiError.js";
import {
  asObject,
  optionalEnum,
  optionalString,
  rejectEmptyPatch,
  requiredEnum,
  requiredString,
} from "./common.validators.js";

const roles = ["Student", "Teacher", "Admin"] as const;

export const validateCreateUser: Validator<CreateUserRequestDto> = (body) => {
  const errors: ErrorDetail[] = [];
  const obj = asObject(body);
  if (!obj) return { value: null, errors: [{ message: "Body must be an object" }] };

  const value = {
    name: requiredString(obj, "name", errors, 2, 80),
    email: requiredString(obj, "email", errors, 5, 120),
    role: requiredEnum(obj, "role", roles, errors),
  };
  if (value.email && !/^\S+@\S+\.\S+$/.test(value.email))
    errors.push({ field: "email", message: "email must have a valid format" });
  return { value, errors };
};

export const validateUpdateUser: Validator<UpdateUserRequestDto> = validateCreateUser;

export const validatePatchUser: Validator<PatchUserRequestDto> = (body) => {
  const errors: ErrorDetail[] = [];
  const obj = asObject(body);
  if (!obj) return { value: null, errors: [{ message: "Body must be an object" }] };
  rejectEmptyPatch(obj, errors);

  const value: PatchUserRequestDto = {};
  const name = optionalString(obj, "name", errors, 80);
  const email = optionalString(obj, "email", errors, 120);
  const role = optionalEnum(obj, "role", roles, errors);
  if (name !== undefined) value.name = name;
  if (email !== undefined) value.email = email;
  if (role !== undefined) value.role = role;
  if (value.email && !/^\S+@\S+\.\S+$/.test(value.email))
    errors.push({ field: "email", message: "email must have a valid format" });
  return { value, errors };
};
