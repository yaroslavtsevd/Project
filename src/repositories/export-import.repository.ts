import { all, run, esc } from "../db/dbClient.js";

// ── export types ──────────────────────────────────────────────────────────────

export interface ExportAnswer {
  userId: number;
  value: unknown;
}

export interface ExportQuestion {
  text: string;
  type: string;
  options: string[];
  order: number;
  answers: ExportAnswer[];
}

export interface ExportPoll {
  title: string;
  author: string;
  endDate: string;
  visibility: string;
  description: string;
  questions: ExportQuestion[];
}

export interface ExportPayload {
  exportedAt: string;
  version: string;
  polls: ExportPoll[];
}

// ── import types ──────────────────────────────────────────────────────────────

export interface ImportResult {
  pollsCreated: number;
  pollsSkipped: number;
  questionsCreated: number;
  answersCreated: number;
  errors: string[];
}

// ── export ────────────────────────────────────────────────────────────────────

export async function exportAllPolls(): Promise<ExportPayload> {
  // 1. Active polls
  const pollRows = await all<Record<string, unknown>>(`
    SELECT id, title, author, endDate, visibility, description
    FROM   Polls
    WHERE  deletedAt IS NULL
    ORDER  BY id ASC;
  `);

  const polls: ExportPoll[] = [];

  for (const pollRow of pollRows) {
    const pollId = pollRow["id"] as number;

    // 2. Questions for this poll (JOIN + COUNT answers — aggregation)
    const qRows = await all<Record<string, unknown>>(`
      SELECT
        q.id,
        q.text,
        q.type,
        q.options,
        q."order",
        COUNT(a.id) AS answerCount
      FROM  Questions q
      LEFT  JOIN Answers a ON a.questionId = q.id AND a.deletedAt IS NULL
      WHERE q.pollId    = ${pollId}
        AND q.deletedAt IS NULL
      GROUP BY q.id
      ORDER BY q."order" ASC, q.id ASC;
    `);

    const questions: ExportQuestion[] = [];

    for (const qRow of qRows) {
      const questionId = qRow["id"] as number;
      let options: string[] = [];
      try { options = JSON.parse(qRow["options"] as string) as string[]; } catch { options = []; }

      // 3. Answers for this question
      const aRows = await all<Record<string, unknown>>(`
        SELECT userId, value
        FROM   Answers
        WHERE  questionId = ${questionId} AND deletedAt IS NULL
        ORDER  BY id ASC;
      `);

      const answers: ExportAnswer[] = aRows.map((a) => {
        let value: unknown = a["value"];
        try { value = JSON.parse(a["value"] as string) as unknown; } catch { /* keep raw */ }
        return { userId: a["userId"] as number, value };
      });

      questions.push({
        text: qRow["text"] as string,
        type: qRow["type"] as string,
        options,
        order: qRow["order"] as number,
        answers,
      });
    }

    polls.push({
      title: pollRow["title"] as string,
      author: pollRow["author"] as string,
      endDate: pollRow["endDate"] as string,
      visibility: pollRow["visibility"] as string,
      description: (pollRow["description"] as string) ?? "",
      questions,
    });
  }

  return { exportedAt: new Date().toISOString(), version: "0.3.0", polls };
}

// ── import ────────────────────────────────────────────────────────────────────

const IMPORT_LIMITS = { maxPolls: 10, maxQuestionsPerPoll: 20 };

const ALLOWED_VISIBILITY = new Set(["Public", "Private"]);
const ALLOWED_TYPES = new Set(["single", "multiple", "text"]);

export async function importPolls(payload: unknown): Promise<ImportResult> {
  const result: ImportResult = {
    pollsCreated: 0,
    pollsSkipped: 0,
    questionsCreated: 0,
    answersCreated: 0,
    errors: [],
  };

  // Basic structure validation
  if (!payload || typeof payload !== "object" || !Array.isArray((payload as Record<string, unknown>)["polls"])) {
    result.errors.push("Payload must be an object with a 'polls' array.");
    return result;
  }

  const rawPolls = ((payload as Record<string, unknown>)["polls"] as unknown[]).slice(
    0,
    IMPORT_LIMITS.maxPolls,
  );

  const now = new Date().toISOString();

  for (let pi = 0; pi < rawPolls.length; pi++) {
    const p = rawPolls[pi] as Record<string, unknown>;
    const title = String(p["title"] ?? "").trim();
    const author = String(p["author"] ?? "").trim();
    const endDate = String(p["endDate"] ?? "").trim();
    const visibility = String(p["visibility"] ?? "Public").trim();
    const description = String(p["description"] ?? "").trim();

    if (!title || !author || !endDate) {
      result.errors.push(`Poll[${pi}]: 'title', 'author', 'endDate' are required.`);
      continue;
    }
    if (!ALLOWED_VISIBILITY.has(visibility)) {
      result.errors.push(`Poll[${pi}]: visibility must be 'Public' or 'Private'.`);
      continue;
    }

    // Check for duplicate (title + author)
    const existing = await all<{ id: number }>(`
      SELECT id FROM Polls
      WHERE LOWER(title) = '${esc(title.toLowerCase())}' AND LOWER(author) = '${esc(author.toLowerCase())}'
        AND deletedAt IS NULL
      LIMIT 1;
    `);
    if ((existing[0]?.id ?? 0) > 0) {
      result.pollsSkipped++;
      result.errors.push(`Poll[${pi}] "${title}" by "${author}" already exists — skipped.`);
      continue;
    }

    const pollRes = await run(`
      INSERT INTO Polls (title, author, endDate, visibility, description, createdAt, updatedAt, deletedAt)
      VALUES ('${esc(title)}', '${esc(author)}', '${esc(endDate)}', '${esc(visibility)}', '${esc(description)}', '${now}', '${now}', NULL);
    `);
    const pollId = pollRes.lastID;
    result.pollsCreated++;

    const rawQuestions = Array.isArray(p["questions"])
      ? (p["questions"] as unknown[]).slice(0, IMPORT_LIMITS.maxQuestionsPerPoll)
      : [];

    for (let qi = 0; qi < rawQuestions.length; qi++) {
      const q = rawQuestions[qi] as Record<string, unknown>;
      const text = String(q["text"] ?? "").trim();
      const type = String(q["type"] ?? "single").trim();
      const options = Array.isArray(q["options"]) ? (q["options"] as string[]) : [];
      const order = Number(q["order"] ?? qi + 1);

      if (!text) {
        result.errors.push(`Poll[${pi}].Question[${qi}]: 'text' is required.`);
        continue;
      }
      if (!ALLOWED_TYPES.has(type)) {
        result.errors.push(`Poll[${pi}].Question[${qi}]: type must be 'single', 'multiple', or 'text'.`);
        continue;
      }

      const qRes = await run(`
        INSERT INTO Questions (pollId, text, type, options, "order", createdAt, updatedAt, deletedAt)
        VALUES (${pollId}, '${esc(text)}', '${esc(type)}', '${esc(JSON.stringify(options))}', ${order}, '${now}', '${now}', NULL);
      `);
      result.questionsCreated++;

      // Import answers (best-effort; skip if userId missing)
      const rawAnswers = Array.isArray(q["answers"])
        ? (q["answers"] as unknown[]).slice(0, 50)
        : [];

      for (const rawA of rawAnswers) {
        const a = rawA as Record<string, unknown>;
        const userId = Number(a["userId"] ?? 0);
        if (!userId) continue;
        const userExists = await all<{ id: number }>(`SELECT id FROM Users WHERE id = ${userId} AND deletedAt IS NULL LIMIT 1;`);
        if (!userExists[0]) continue;
        const valueJson = JSON.stringify(a["value"] ?? "");
        await run(`
          INSERT OR IGNORE INTO Answers (questionId, userId, value, createdAt, updatedAt, deletedAt)
          VALUES (${qRes.lastID}, ${userId}, '${esc(valueJson)}', '${now}', '${now}', NULL);
        `);
        result.answersCreated++;
      }
    }
  }

  return result;
}
