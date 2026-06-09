import type {
  CreatePollRequestDto,
  PatchPollRequestDto,
  UpdatePollRequestDto,
} from "../dtos/polls.dto.js";
import type { Validator } from "./validation.types.js";
import type { ErrorDetail } from "../errors/ApiError.js";
import {
  asObject,
  optionalEnum,
  optionalIsoDate,
  optionalString,
  rejectEmptyPatch,
  requiredEnum,
  requiredIsoDate,
  requiredString,
} from "./common.validators.js";

const visibilities = ["Public", "Private"] as const;

function readDescription(
  obj: Record<string, unknown>,
  errors: { field?: string; message: string }[],
): string {
  return (
    optionalString(obj, "description", errors, 250) ??
    optionalString(obj, "desc", errors, 250) ??
    ""
  );
}

export const validateCreatePoll: Validator<CreatePollRequestDto> = (body) => {
  const errors: ErrorDetail[] = [];
  const obj = asObject(body);
  if (!obj) return { value: null, errors: [{ message: "Body must be an object" }] };

  const value = {
    title: requiredString(obj, "title", errors, 3, 80),
    author: requiredString(obj, "author", errors, 2, 80),
    endDate: requiredIsoDate(obj, "endDate", errors),
    visibility: requiredEnum(obj, "visibility", visibilities, errors),
    description: readDescription(obj, errors),
  };
  return { value, errors };
};

export const validateUpdatePoll: Validator<UpdatePollRequestDto> = (body) => {
  const result = validateCreatePoll(body);
  if (result.value === null) return { value: null, errors: result.errors };
  return {
    value: { ...result.value, description: result.value.description ?? "" },
    errors: result.errors,
  };
};

export const validatePatchPoll: Validator<PatchPollRequestDto> = (body) => {
  const errors: ErrorDetail[] = [];
  const obj = asObject(body);
  if (!obj) return { value: null, errors: [{ message: "Body must be an object" }] };
  rejectEmptyPatch(obj, errors);

  const value: PatchPollRequestDto = {};
  const title = optionalString(obj, "title", errors, 80);
  const author = optionalString(obj, "author", errors, 80);
  const endDate = optionalIsoDate(obj, "endDate", errors);
  const visibility = optionalEnum(obj, "visibility", visibilities, errors);
  const description =
    optionalString(obj, "description", errors, 250) ?? optionalString(obj, "desc", errors, 250);

  if (title !== undefined) value.title = title;
  if (author !== undefined) value.author = author;
  if (endDate !== undefined) value.endDate = endDate;
  if (visibility !== undefined) value.visibility = visibility;
  if (description !== undefined) value.description = description;
  return { value, errors };
};
