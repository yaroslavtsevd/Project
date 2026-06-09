import type {
  CreateQuestionRequestDto,
  PatchQuestionRequestDto,
  UpdateQuestionRequestDto,
} from "../dtos/questions.dto.js";
import type { Validator } from "./validation.types.js";
import type { ErrorDetail } from "../errors/ApiError.js";
import {
  asObject,
  optionalEnum,
  optionalNumber,
  optionalString,
  optionalStringArray,
  rejectEmptyPatch,
  requiredEnum,
  requiredNumber,
  requiredString,
  requiredStringArray,
} from "./common.validators.js";

const types = ["single", "multiple", "text"] as const;

function validateOptionsByType(
  type: string | undefined,
  options: string[] | undefined,
  errors: { field?: string; message: string }[],
): void {
  if ((type === "single" || type === "multiple") && (!options || options.length < 2)) {
    errors.push({
      field: "options",
      message: "single/multiple question must have at least 2 options",
    });
  }
  if (type === "text" && options && options.length > 0) {
    errors.push({ field: "options", message: "text question must not have options" });
  }
}

export const validateCreateQuestion: Validator<CreateQuestionRequestDto> = (body) => {
  const errors: ErrorDetail[] = [];
  const obj = asObject(body);
  if (!obj) return { value: null, errors: [{ message: "Body must be an object" }] };

  const type = requiredEnum(obj, "type", types, errors);
  const options = requiredStringArray(obj, "options", errors, type === "text" ? 0 : 2);
  validateOptionsByType(type, options, errors);

  const value = {
    pollId: requiredNumber(obj, "pollId", errors),
    text: requiredString(obj, "text", errors, 3, 200),
    type,
    options,
    order: requiredNumber(obj, "order", errors, 1),
  };
  return { value, errors };
};

export const validateUpdateQuestion: Validator<UpdateQuestionRequestDto> = validateCreateQuestion;

export const validatePatchQuestion: Validator<PatchQuestionRequestDto> = (body) => {
  const errors: ErrorDetail[] = [];
  const obj = asObject(body);
  if (!obj) return { value: null, errors: [{ message: "Body must be an object" }] };
  rejectEmptyPatch(obj, errors);

  const value: PatchQuestionRequestDto = {};
  const pollId = optionalNumber(obj, "pollId", errors);
  const text = optionalString(obj, "text", errors, 200);
  const type = optionalEnum(obj, "type", types, errors);
  const options = optionalStringArray(obj, "options", errors);
  const order = optionalNumber(obj, "order", errors);
  validateOptionsByType(type, options, errors);

  if (pollId !== undefined) value.pollId = pollId;
  if (text !== undefined) value.text = text;
  if (type !== undefined) value.type = type;
  if (options !== undefined) value.options = options;
  if (order !== undefined) value.order = order;
  return { value, errors };
};
