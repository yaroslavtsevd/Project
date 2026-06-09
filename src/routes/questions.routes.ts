import { Router } from "express";
import {
  createQuestion,
  deleteQuestion,
  getQuestionById,
  getQuestionList,
  patchQuestion,
  updateQuestion,
} from "../controllers/questions.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validationMiddleware } from "../validation/validation.types.js";
import {
  validateCreateQuestion,
  validatePatchQuestion,
  validateUpdateQuestion,
} from "../validation/questions.validators.js";

export const questionsRouter = Router();

questionsRouter.get("/", asyncHandler(getQuestionList));
questionsRouter.get("/:id", asyncHandler(getQuestionById));
questionsRouter.post(
  "/",
  validationMiddleware(validateCreateQuestion),
  asyncHandler(createQuestion),
);
questionsRouter.put(
  "/:id",
  validationMiddleware(validateUpdateQuestion),
  asyncHandler(updateQuestion),
);
questionsRouter.patch(
  "/:id",
  validationMiddleware(validatePatchQuestion),
  asyncHandler(patchQuestion),
);
questionsRouter.delete("/:id", asyncHandler(deleteQuestion));
