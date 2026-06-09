import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { register, login, logout, getMe, getSessions } from "../controllers/auth.controller.js";

export const authRouter = Router();

// Public routes
authRouter.post("/register", asyncHandler(register));
authRouter.post("/login",    asyncHandler(login));
authRouter.post("/logout",   asyncHandler(logout));

// Protected routes (require valid session)
authRouter.get("/me",       asyncHandler(requireAuth), asyncHandler(getMe));
authRouter.get("/sessions", asyncHandler(requireAuth), asyncHandler(getSessions));
