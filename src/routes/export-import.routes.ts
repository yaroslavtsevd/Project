import { Router } from "express";
import { exportData, importData } from "../controllers/export-import.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const exportImportRouter = Router();

exportImportRouter.get("/export", asyncHandler(exportData));
exportImportRouter.post("/import", asyncHandler(importData));
