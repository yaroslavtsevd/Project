/**
 * Seed script — populates the DB with realistic test data.
 * Safe to re-run: uses INSERT OR IGNORE so no duplicates are created.
 *
 * Lab 5 bonus: seeds users WITH password hashes so full auth works
 * immediately after `npm run seed`.
 *
 * Seed credentials:
 *   oksana@example.com  / Password1!
 *   maria@example.com   / Password2!
 *   ivan@example.com    / Password3!
 *   andrii@example.com  / Password4!
 *   admin@example.com   / AdminPass1!
 */
import { migrate } from "./migrate.js";
import { run } from "./dbClient.js";
import { createPasswordHash } from "../services/auth.service.js";

async function seed(): Promise<void> {
  await migrate();
  const now = new Date().toISOString();
  console.log("[Seed] Starting...");

  // ── Users (5) with password hashes ────────────────────────────────────────
  const users = [
    { name: "Оксана Дудар",   email: "oksana@example.com",  role: "Student", pw: "Password1!" },
    { name: "Марія Іваненко", email: "maria@example.com",   role: "Student", pw: "Password2!" },
    { name: "Іван Коваль",    email: "ivan@example.com",    role: "Student", pw: "Password3!" },
    { name: "Андрій Мороз",   email: "andrii@example.com",  role: "Teacher", pw: "Password4!" },
    { name: "Адміністратор",  email: "admin@example.com",   role: "Admin",   pw: "AdminPass1!" },
  ];
  for (const u of users) {
    const { hash, salt } = await createPasswordHash(u.pw);
    await run(
      `INSERT OR IGNORE INTO Users (name, email, role, passwordHash, passwordSalt, createdAt, updatedAt, deletedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL);`,
      [u.name, u.email, u.role, hash, salt, now, now],
    );
    // If user already exists but has no hash (e.g. from old seed), update it
    await run(
      `UPDATE Users SET passwordHash = ?, passwordSalt = ?
       WHERE email = ? AND (passwordHash IS NULL OR passwordHash = '');`,
      [hash, salt, u.email],
    );
  }
  console.log("[Seed] Users: done");

  // ── Polls (4) ──────────────────────────────────────────────────────────────
  const polls = [
    {
      title: "Вибір теми семестрового проєкту",
      author: "Андрій Мороз",
      endDate: "2026-06-01",
      visibility: "Public",
      description: "Студенти обирають тему командного проєкту на семестр.",
    },
    {
      title: "Зручний час консультацій",
      author: "Андрій Мороз",
      endDate: "2026-06-10",
      visibility: "Private",
      description: "Визначення зручного розкладу консультацій для групи.",
    },
    {
      title: "Оцінка якості курсу",
      author: "Адміністратор",
      endDate: "2026-07-01",
      visibility: "Public",
      description: "Анонімне опитування про якість викладання дисципліни.",
    },
    {
      title: "Вибір формату іспиту",
      author: "Андрій Мороз",
      endDate: "2026-05-30",
      visibility: "Public",
      description: "Чи хочуть студенти складати іспит усно чи письмово?",
    },
  ];
  for (const p of polls) {
    await run(
      `INSERT OR IGNORE INTO Polls
        (title, author, endDate, visibility, description, createdAt, updatedAt, deletedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL);`,
      [p.title, p.author, p.endDate, p.visibility, p.description, now, now],
    );
  }
  console.log("[Seed] Polls: done");

  // ── Questions (8) ──────────────────────────────────────────────────────────
  const questions = [
    { pollId: 1, text: "Яку тему обираємо?", type: "single",
      options: ["Web API та безпека","Мобільний застосунок","Аналіз даних та ML"], order: 1 },
    { pollId: 1, text: "Яка мова програмування для реалізації?", type: "multiple",
      options: ["TypeScript","Python","Go","Rust"], order: 2 },
    { pollId: 2, text: "Коли зручно прийти на консультацію?", type: "single",
      options: ["Понеділок 16:00","Середа 18:00","П'ятниця 14:00"], order: 1 },
    { pollId: 2, text: "Формат консультації?", type: "single",
      options: ["Очно","Online (Zoom)","Не важливо"], order: 2 },
    { pollId: 3, text: "Як ви оцінюєте матеріал курсу?", type: "single",
      options: ["Відмінно","Добре","Задовільно","Незадовільно"], order: 1 },
    { pollId: 3, text: "Що варто покращити?", type: "text",
      options: [], order: 2 },
    { pollId: 4, text: "Формат іспиту?", type: "single",
      options: ["Усно","Письмово","Тест на комп'ютері"], order: 1 },
    { pollId: 4, text: "Чи потрібні додаткові заняття перед іспитом?", type: "single",
      options: ["Так","Ні","Не впевнений(а)"], order: 2 },
  ];
  for (const q of questions) {
    const opts = JSON.stringify(q.options);
    await run(
      `INSERT OR IGNORE INTO Questions
        (pollId, text, type, options, "order", createdAt, updatedAt, deletedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL);`,
      [q.pollId, q.text, q.type, opts, q.order, now, now],
    );
  }
  console.log("[Seed] Questions: done");

  // ── Answers (6) ────────────────────────────────────────────────────────────
  const answers = [
    { questionId: 1, userId: 1, value: '"Web API та безпека"' },
    { questionId: 1, userId: 2, value: '"Аналіз даних та ML"' },
    { questionId: 2, userId: 1, value: '["TypeScript","Go"]' },
    { questionId: 3, userId: 1, value: '"Середа 18:00"' },
    { questionId: 3, userId: 3, value: '"Понеділок 16:00"' },
    { questionId: 5, userId: 2, value: '"Відмінно"' },
  ];
  for (const a of answers) {
    await run(
      `INSERT OR IGNORE INTO Answers
        (questionId, userId, value, createdAt, updatedAt, deletedAt)
       VALUES (?, ?, ?, ?, ?, NULL);`,
      [a.questionId, a.userId, a.value, now, now],
    );
  }
  console.log("[Seed] Answers: done");

  // ── PersonalNotes (Lab 5 — IDOR demo data) ─────────────────────────────────
  // User 1 (Oksana) owns notes 1 & 2; User 2 (Maria) owns note 3.
  const notes = [
    { ownerUserId: 1, title: "Мої нотатки з алгоритмів", content: "BFS, DFS, Dijkstra — повторити перед іспитом." },
    { ownerUserId: 1, title: "Плани на семестр",          content: "Здати всі лабораторні вчасно." },
    { ownerUserId: 2, title: "Конспект з БД",             content: "Нормалізація, транзакції, індекси." },
  ];
  for (const n of notes) {
    await run(
      `INSERT OR IGNORE INTO PersonalNotes (ownerUserId, title, content, createdAt, updatedAt, deletedAt)
       VALUES (?, ?, ?, ?, ?, NULL);`,
      [n.ownerUserId, n.title, n.content, now, now],
    );
  }
  console.log("[Seed] PersonalNotes: done");

  console.log("[Seed] Completed successfully.");
  process.exit(0);
}

seed().catch((err: unknown) => {
  console.error("[Seed] Error:", err);
  process.exit(1);
});
