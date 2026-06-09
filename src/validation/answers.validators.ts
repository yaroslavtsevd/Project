import type {
  CreateAnswerRequestDto,
  PatchAnswerRequestDto,
  UpdateAnswerRequestDto,
} from "../dtos/answers.dto.js";
import type { Validator } from "./validation.types.js";
import type { ErrorDetail } from "../errors/ApiError.js";
import {
  answerValue,
  asObject,
  optionalAnswerValue,
  optionalNumber,
  rejectEmptyPatch,
  requiredNumber,
} from "./common.validators.js";

export const validateCreateAnswer: Validator<CreateAnswerRequestDto> = (body) => {
  const errors: ErrorDetail[] = [];
  const obj = asObject(body);
  if (!obj) return { value: null, errors: [{ message: "Body must be an object" }] };

  const value = {
    questionId: requiredNumber(obj, "questionId", errors),
    userId: requiredNumber(obj, "userId", errors),
    value: answerValue(obj, "value", errors),
  };
  return { value, errors };
};

export const validateUpdateAnswer: Validator<UpdateAnswerRequestDto> = validateCreateAnswer;

export const validatePatchAnswer: Validator<PatchAnswerRequestDto> = (body) => {
  const errors: ErrorDetail[] = [];
  const obj = asObject(body);
  if (!obj) return { value: null, errors: [{ message: "Body must be an object" }] };
  rejectEmptyPatch(obj, errors);

  const value: PatchAnswerRequestDto = {};
  const questionId = optionalNumber(obj, "questionId", errors);
  const userId = optionalNumber(obj, "userId", errors);
  const val = optionalAnswerValue(obj, "value", errors);
  if (questionId !== undefined) value.questionId = questionId;
  if (userId !== undefined) value.userId = userId;
  if (val !== undefined) value.value = val;
  return { value, errors };
};
