import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import cookieParser from "cookie-parser";
import { answersRouter } from "./routes/answers.routes.js";
import { pollsRouter } from "./routes/polls.routes.js";
import { questionsRouter } from "./routes/questions.routes.js";
import { usersRouter } from "./routes/users.routes.js";
import { exportImportRouter } from "./routes/export-import.routes.js";
import { notesRouter, notesVulnRouter } from "./routes/notes.routes.js";
import { authRouter } from "./routes/auth.routes.js";
import { commentsRouter } from "./routes/comments.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFoundHandler } from "./middleware/notFoundHandler.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { openApiSpec } from "./openapi.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS: origin "${origin}" is not allowed`), false);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Demo-UserId"],
    credentials: true,  // allow cookies for session_token
  }),
);

app.options("*", cors());

// ── Security headers (Lab 5 – Misconfiguration hardening) ────────────────────
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  // Basic CSP: allow same-origin resources + unpkg CDN (for Swagger UI)
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com; style-src 'self' 'unsafe-inline' https://unpkg.com; img-src 'self' data:",
  );
  next();
});

// ── Body parsing & logging ────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(requestLogger);

// ── Utility routes ────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

app.get("/openapi.json", (_req, res) => {
  res.status(200).json(openApiSpec);
});

app.get("/api-docs", (_req, res) => {
  res.status(200).send(`<!doctype html>
<html lang="uk">
<head>
  <meta charset="utf-8" />
  <title>Polls API Swagger UI</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>window.onload = () => window.ui = SwaggerUIBundle({ url: '/openapi.json', dom_id: '#swagger-ui' });</script>
</body>
</html>`);
});

// ── API routes (v1) ───────────────────────────────────────────────────────────
app.use("/api/v1/auth",      authRouter);          // Lab 5 bonus: full auth
app.use("/api/v1/users",     usersRouter);
app.use("/api/v1/polls",     pollsRouter);
app.use("/api/v1/questions", questionsRouter);
app.use("/api/v1/answers",   answersRouter);
app.use("/api/v1",           exportImportRouter);

// Lab 5 XSS demo: comments endpoint
app.use("/api/v1/polls/:pollId/comments", commentsRouter);

// Lab 5: PersonalNotes (secure) + IDOR demo (vulnerable)
app.use("/api/v1/notes",      notesRouter);
app.use("/api/v1/notes-vuln", notesVulnRouter);

// Legacy aliases
app.use("/api/users",     usersRouter);
app.use("/api/polls",     pollsRouter);
app.use("/api/questions", questionsRouter);
app.use("/api/answers",   answersRouter);
app.use("/api",           exportImportRouter);

// ── Static frontend ───────────────────────────────────────────────────────────
const publicPath = path.resolve(__dirname, "../public");
app.use(express.static(publicPath));

// ── Error handling ────────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);
