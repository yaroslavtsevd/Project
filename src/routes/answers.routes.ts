import { Router } from "express";
import {
  createAnswer,
  deleteAnswer,
  getAnswerById,
  getAnswerList,
  patchAnswer,
  updateAnswer,
} from "../controllers/answers.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validationMiddleware } from "../validation/validation.types.js";
import {
  validateCreateAnswer,
  validatePatchAnswer,
  validateUpdateAnswer,
} from "../validation/answers.validators.js";

export const answersRouter = Router();

answersRouter.get("/", asyncHandler(getAnswerList));
answersRouter.get("/:id", asyncHandler(getAnswerById));
answersRouter.post("/", validationMiddleware(validateCreateAnswer), asyncHandler(createAnswer));
answersRouter.put("/:id", validationMiddleware(validateUpdateAnswer), asyncHandler(updateAnswer));
answersRouter.patch("/:id", validationMiddleware(validatePatchAnswer), asyncHandler(patchAnswer));
answersRouter.delete("/:id", asyncHandler(deleteAnswer));
