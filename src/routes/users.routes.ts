import { Router } from "express";
import {
  createUser,
  deleteUser,
  getUserById,
  getUserList,
  patchUser,
  updateUser,
} from "../controllers/users.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validationMiddleware } from "../validation/validation.types.js";
import {
  validateCreateUser,
  validatePatchUser,
  validateUpdateUser,
} from "../validation/users.validators.js";

export const usersRouter = Router();

usersRouter.get("/", asyncHandler(getUserList));
usersRouter.get("/:id", asyncHandler(getUserById));
usersRouter.post("/", validationMiddleware(validateCreateUser), asyncHandler(createUser));
usersRouter.put("/:id", validationMiddleware(validateUpdateUser), asyncHandler(updateUser));
usersRouter.patch("/:id", validationMiddleware(validatePatchUser), asyncHandler(patchUser));
usersRouter.delete("/:id", asyncHandler(deleteUser));
