import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { listComments, addComment } from "../controllers/comments.controller.js";

export const commentsRouter = Router({ mergeParams: true });

commentsRouter.get("/",  asyncHandler(listComments));
commentsRouter.post("/", asyncHandler(requireAuth), asyncHandler(addComment));
