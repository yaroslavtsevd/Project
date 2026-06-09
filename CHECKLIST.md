# Lab 5 — Checklist Verification
## Yaroslavtsev · v1.0.0

Цей документ перевіряє кожен пункт чекліста, вказує конкретний файл/рядок у коді та описує як це продемонструвати.

---

## ✅ ЗАДОВІЛЬНО

### 1. Два сценарії: SQLi (A) + IDOR (B)
> *відтворення + виправлення + перевірка*

**SQLi (A):**
- Вразливий ендпойнт: `GET /api/v1/polls/search-vuln?q=<payload>`
  - Файл: `src/repositories/polls.repository.ts` → `searchPollsByTitleVulnerable()`
  - Файл: `src/controllers/polls.controller.ts` → `searchPollsVulnerable()`
  - Файл: `src/routes/polls.routes.ts` → `GET /search-vuln`
- Виправлений ендпойнт: `GET /api/v1/polls/search?q=<query>`
  - Файл: `src/repositories/polls.repository.ts` → `searchPollsByTitle()`

**IDOR (B):**
- Вразливий ендпойнт: `GET /api/v1/notes-vuln/:id`
  - Файл: `src/repositories/notes.repository.ts` → `getNoteByIdVulnerable()`
  - Файл: `src/routes/notes.routes.ts` → `notesVulnRouter`
- Виправлений ендпойнт: `GET /api/v1/notes/:id`
  - Файл: `src/repositories/notes.repository.ts` → `getNoteByIdSecure()`

---

### 2. У звіті є «до/після», виправлення не ламає функціонал, обробка помилок не падає з 500

**«до/після»:** описано в `REPORT.md` для кожного сценарію.

**Функціонал не зламано:**
```http
GET /api/v1/polls/search?q=семестр   → 200, знаходить опитування ✓
GET /api/v1/notes (X-Demo-UserId: 1) → 200, список нотаток ✓
```

**Обробка помилок 4xx замість 500:**
- Файл: `src/middleware/errorHandler.ts`
- UNIQUE constraint → 409, NOT NULL → 400, чужий ресурс → 404, не авторизований → 401

---

### 3. X-Demo-UserId для currentUserId
- Файл: `src/middleware/requireAuth.ts`, рядки 30–46
```typescript
const raw = req.header("X-Demo-UserId");
if (raw) {
  const id = Number(raw);
  // ...перевірки...
  (req as AuthedRequest).currentUserId = user.id;
  next();
}
```

---

### 4. Узгоджена поведінка бекенду: без заголовка → 401, невалідний → 401

- Файл: `src/middleware/requireAuth.ts`
```
Немає Authorization і немає X-Demo-UserId → 401 "Authentication required"
X-Demo-UserId: abc (не число) → 401 "Invalid X-Demo-UserId value"
X-Demo-UserId: 999 (не існує) → 401 "User not found"
Bearer wrongtoken → 401 "Invalid or expired token"
```

**Демонстрація:**
```bash
curl http://localhost:3000/api/v1/notes
# → 401 {"error":{"code":"UNAUTHORIZED","message":"Authentication required..."}}

curl -H "X-Demo-UserId: abc" http://localhost:3000/api/v1/notes
# → 401 {"error":{"code":"UNAUTHORIZED","message":"Invalid X-Demo-UserId value"}}
```

---

### 5. ownerUserId у сутності + серверна перевірка

- Міграція: `migrations/007_create_personal_notes.sql` → колонка `ownerUserId INTEGER NOT NULL`
- Файл: `src/repositories/notes.repository.ts`
  - `getNoteByIdSecure()` → `WHERE id = ? AND ownerUserId = ?`
  - `updateNoteSecure()` → `WHERE id = ? AND ownerUserId = ?`
  - `deleteNoteSecure()` → `WHERE id = ? AND ownerUserId = ?`

---

### 6. Базова ідентифікація + 401 якщо нема контексту

- Файл: `src/middleware/requireAuth.ts`, рядки 52–59
```typescript
// ── 3. Neither → 401 ─────────────────────────────────────────────────────
res.status(401).json({
  error: {
    code: "UNAUTHORIZED",
    message: "Authentication required (Bearer token or X-Demo-UserId header)",
  },
});
```
- Всі захищені маршрути використовують цей middleware: `notesRouter.use(asyncHandler(requireAuth))`

---

### 7. Задокументовано SQLi у вразливій версії + пояснення

**Де в коді:**
```typescript
// src/repositories/polls.repository.ts — searchPollsByTitleVulnerable()
const sql = `...WHERE title LIKE '%${q}%'...`;
// q вставляється як SQL-код, не як дані
```

**PoC запит:**
```bash
# Тавтологія — повертає всі записи (витік):
curl "http://localhost:3000/api/v1/polls/search-vuln?q=%25'%20OR%20'1'%3D'1"

# Синтаксична помилка:
curl "http://localhost:3000/api/v1/polls/search-vuln?q='"
```

**Чому проходить:** рядок `q` стає частиною SQL-коду. БД отримує:
`WHERE title LIKE '%' OR '1'='1%'` — умова `'1'='1'` завжди true → повертає всі рядки.

---

### 8. Виправлено SQLi + повторний PoC не проходить

**Де в коді:**
```typescript
// src/repositories/polls.repository.ts — searchPollsByTitle()
const sql = `...WHERE title LIKE ? AND deletedAt IS NULL...`;
const rows = await all<...>(sql, [`%${q}%`]);  // ← bound parameter
```

**Повторний PoC:**
```bash
curl "http://localhost:3000/api/v1/polls/search?q=%25'%20OR%20'1'%3D'1"
# → 200 {"data":[], "meta":{"count":0}}  ← порожній результат, не дамп
```

---

### 9. Задокументовано IDOR + де «дірка»

**Де в коді:**
```typescript
// src/repositories/notes.repository.ts — getNoteByIdVulnerable()
// VULNERABILITY: no ownerUserId check
const row = await get(`SELECT ... FROM PersonalNotes WHERE id = ?`, [id]);
// будь-який авт. користувач може читати нотатки за id
```

**PoC:**
```bash
# User 2 читає нотатку User 1 (IDOR — чужа нотатка):
curl -H "X-Demo-UserId: 2" http://localhost:3000/api/v1/notes-vuln/1
# → 200 {"data":{"id":1,"ownerUserId":1,"title":"Мої нотатки..."}}  ← ДІРКА
```

---

### 10. Виправлено IDOR: серверна перевірка, 403/404, фронтенд не ховає проблему

**Де в коді:**
```typescript
// src/repositories/notes.repository.ts — getNoteByIdSecure()
`SELECT ... FROM PersonalNotes WHERE id = ? AND ownerUserId = ? AND deletedAt IS NULL`
// Якщо ownerUserId не збігається → 0 рядків → контролер повертає 404
```

**Перевірка:**
```bash
# Той самий запит через захищений endpoint:
curl -H "X-Demo-UserId: 2" http://localhost:3000/api/v1/notes/1
# → 404 {"error":{"code":"NOT_FOUND","message":"Note not found"}}  ← захист працює
```

---

## ✅ ДОБРЕ

### 1. Три сценарії: A + B + (Б або Г)
Реалізовано всі 4: A (SQLi) + Б (XSS) + B (IDOR) + Г (Misconfiguration) — відповідає рівню **відмінно**.

---

### 2. XSS: виправлення як безпечне відображення, не «заборонили все»

**Де в коді:**
- Файл: `public/xss-demo.html`

```javascript
// ВРАЗЛИВО:
li.innerHTML = c.body;          // браузер парсить як HTML

// БЕЗПЕЧНО:
const text = document.createTextNode(c.body);  // plain text node
li.appendChild(text);           // НЕ HTML, браузер не інтерпретує теги
```

**Чому так:** сервер зберігає текст без фільтрації. Безпека на виході (output encoding), а не вхідному фільтрі.

---

### 3. Misconfiguration: базові заголовки + прибрані dev-деталі + узгоджені коди

**Заголовки** (файл: `src/app.ts`):
```typescript
res.setHeader("X-Content-Type-Options", "nosniff");
res.setHeader("X-Frame-Options", "DENY");
res.setHeader("Referrer-Policy", "no-referrer");
res.setHeader("Content-Security-Policy", "default-src 'self'; ...");
```

**Без dev-деталей** (файл: `src/middleware/errorHandler.ts`):
```typescript
res.status(500).json({
  error: { code: "INTERNAL_SERVER_ERROR", message: "Unexpected server error", details: null }
  // Без stack trace, без шляхів файлів
});
```

---

### 4. Захист від XSS у UI

- Файл: `public/xss-demo.html` → `createTextNode()` / `textContent`
- Файл: `frontend-ts/src/ui.ts` → функція `escHtml()` екранує `&`, `<`, `>`, `"`

---

### 5. Централізована обробка помилок

- Файл: `src/middleware/errorHandler.ts` — єдиний `app.use(errorHandler)` в `src/app.ts`
- Всі помилки приходять через `next(err)` або `asyncHandler` → єдиний формат:
```json
{ "error": { "code": "...", "message": "...", "details": null } }
```

---

### 6. Помилки безпеки у єдиному форматі

Всі відповіді мають однаковий shape `{ error: { code, message, details } }`:
- `src/middleware/requireAuth.ts` — 401
- `src/middleware/errorHandler.ts` — 400/409/500
- `src/controllers/notes.controller.ts` — 400/404
- `src/controllers/auth.controller.ts` — 400/401/409/429

---

### 7. Авторизація в middleware, не копіюється в кожному роуті

- Файл: `src/routes/notes.routes.ts`
```typescript
// Один рядок захищає ВСІ маршрути:
notesRouter.use(asyncHandler(requireAuth));
// Далі всі GET/POST/PUT/DELETE автоматично вимагають авторизацію
```
- Перевірка власника інкапсульована в репозиторії (`getNoteByIdSecure`, `updateNoteSecure`, `deleteNoteSecure`), не дублюється у контролерах.

---

### 8. Структурований REPORT.md

- Файл: `REPORT.md` — для кожного сценарію: «як відтворити → як виправлено → як перевірити»

---

### 9. CORS не «все всім»

- Файл: `src/app.ts`
```typescript
const allowedOrigins = ["http://localhost:5500", "http://localhost:5173", "http://localhost:3000"];
cors({ origin: (origin, cb) => allowedOrigins.includes(origin) ? cb(null, true) : cb(Error(...)) })
```

---

## ✅ ВІДМІННО

### 1. Всі 4 сценарії: A + Б + B + Г ✓

### 2. Security regression набір

- Файл: `security-regression.http` — 20+ HTTP-запитів що покривають всі сценарії
- Використання: VS Code REST Client або httpYac

---

### 3. Бекенд на TypeScript ✓

Всі файли `*.ts`, `tsconfig.json` налаштований, `package.json` → `tsx`.

---

### 4. SQLi — параметризація видна в коді та поясненні

```typescript
// src/repositories/polls.repository.ts — рядок ~108
// FIX (Lab 5): user input is passed as a bound parameter, NOT concatenated
const sql = `...WHERE title LIKE ? AND deletedAt IS NULL...`;
const rows = await all<...>(sql, [`%${q}%`]);
//                               ↑ окремий масив параметрів
```

---

### 5. Access Control на кожній операції (read/update/delete) ✓

| Операція | Файл | SQL-умова |
|----------|------|-----------|
| READ | `notes.repository.ts` → `getNoteByIdSecure()` | `WHERE id=? AND ownerUserId=?` |
| UPDATE | `notes.repository.ts` → `updateNoteSecure()` | `WHERE id=? AND ownerUserId=?` |
| DELETE | `notes.repository.ts` → `deleteNoteSecure()` | `WHERE id=? AND ownerUserId=?` |

---

### 6. Security headers реально присутні у відповіді

**Демонстрація:**
```bash
curl -I http://localhost:3000/health
```
Відповідь містить:
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: no-referrer
Content-Security-Policy: default-src 'self'; ...
```

---

### 7. Security regression набір (повний) ✓

Файл: `security-regression.http` — покриває:
- SQLi: нормальний пошук, тавтологія OR 1=1, синтаксична помилка `'`
- XSS: збереження payload, отримання, нормальний коментар
- IDOR: чужий GET/PUT/DELETE → 404; свій GET → 200; без auth → 401
- Misconfiguration: headers, clean errors
- Auth: register, login, logout, brute force, token invalidation

---

### 8. Security headers + пояснення

| Заголовок | Захист |
|-----------|--------|
| `X-Content-Type-Options: nosniff` | Браузер не «вгадує» MIME-тип файлу — захист від MIME-sniffing атак |
| `X-Frame-Options: DENY` | Сторінка не може бути вбудована в `<iframe>` — захист від clickjacking |
| `Referrer-Policy: no-referrer` | Браузер не передає заголовок `Referer` — захист від витоку URL |
| `Content-Security-Policy` | Обмежує звідки браузер завантажує скрипти/стилі — бар'єр проти XSS |

---

### 9. Принцип найменших привілеїв

- `GET /api/v1/notes` повертає **тільки нотатки поточного користувача** (не всіх):
  ```typescript
  const notes = await getNotesByOwner(userId);  // WHERE ownerUserId = currentUserId
  ```
- `GET /api/v1/notes/:id` — навіть по ID доступна лише своя нотатка
- Admin endpoints (`requireAdmin`) обмежують доступ по ролі
- Поле `passwordHash/passwordSalt` ніколи не повертається в API-відповідях

---

### 10. Код організовано, легко перевіряється

```
src/
├── middleware/
│   ├── requireAuth.ts    ← вся логіка авторизації в одному місці
│   └── errorHandler.ts   ← централізовані помилки
├── repositories/
│   └── notes.repository.ts  ← перевірки власника у SQL, не в контролерах
├── services/
│   └── auth.service.ts   ← бізнес-логіка автентифікації
└── routes/
    └── notes.routes.ts   ← один .use(requireAuth) захищає всі маршрути
```

---

## ✅ БОНУС — Повна автентифікація

### POST /auth/login + register + seed-користувачі ✓
- Файл: `src/routes/auth.routes.ts` → `POST /api/v1/auth/register`, `POST /api/v1/auth/login`
- Seed credentials у `src/db/seed.ts` (5 користувачів з хешованими паролями)

---

### Паролі: хеш + сіль, не у відкритому вигляді ✓
```typescript
// src/services/auth.service.ts
crypto.pbkdf2(password, salt, 100_000, 32, "sha256", ...)
// salt = crypto.randomBytes(16).toString("hex")  — унікальна для кожного пароля
```

---

### Після логіну: HttpOnly cookie + Bearer token ✓
```typescript
// src/controllers/auth.controller.ts
res.cookie("session_token", result.token, { httpOnly: true, sameSite: "strict" });
res.status(200).json({ data: { token: result.token, user: result.user } });
```

---

### Захищені ендпойнти визначають currentUserId з автентифікації ✓
```typescript
// src/middleware/requireAuth.ts — Bearer token mode
const session = await validateToken(token);
req.currentUserId = session.userId;  // з БД, не від клієнта
```

---

### IDOR «до/після» з повною автентифікацією ✓
```bash
# 1. Login as oksana:
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"oksana@example.com","password":"Password1!"}'
# → {"data":{"token":"abc123...","user":{"id":1,...}}}

# 2. Try to access Maria's note (id=3) with Oksana's token:
curl -H "Authorization: Bearer abc123..." http://localhost:3000/api/v1/notes/3
# → 404 NOT_FOUND  ← захист працює без X-Demo-UserId

# 3. Access own note:
curl -H "Authorization: Bearer abc123..." http://localhost:3000/api/v1/notes/1
# → 200  ← своя нотатка доступна
```

---

### 401/403/404 — узгоджена поведінка ✓

| Ситуація | Код |
|----------|-----|
| Нема токена | 401 |
| Невалідний/прострочений токен | 401 |
| Чужий ресурс | 404 |
| Недостатні права (не Admin) | 403 |

---

### Rate-limit брутфорс: ≥5 спроб/15хв → 429 ✓
```typescript
// src/services/auth.service.ts — checkRateLimit()
if ((row?.cnt ?? 0) >= MAX_ATTEMPTS) {  // MAX_ATTEMPTS = 5
  throw new ApiError(429, "TOO_MANY_REQUESTS", "Забагато невдалих спроб. Спробуйте через 15 хвилин.");
}
```

---

### Повідомлення без деталей (не розкриває існування email) ✓
```typescript
// src/services/auth.service.ts — loginUser()
// Dummy hash обчислюється навіть якщо user не існує (захист від timing attack)
if (!user || !valid) {
  await recordAttempt(email, false);
  throw new ApiError(401, "UNAUTHORIZED", "Невірні облікові дані");
  //    однакове повідомлення незалежно від причини відмови
}
```

---

### Logout + інвалідизація сесії ✓
```typescript
// src/services/auth.service.ts — logoutSession()
await run(`DELETE FROM AuthSessions WHERE token = ?;`, [token]);
// Токен видаляється з БД → наступні запити з цим токеном → 401
```

---

### Базові ролі (Student/Teacher/Admin) + обмеження admin endpoints ✓
```typescript
// src/middleware/requireAuth.ts — requireAdmin()
export function requireAdmin(req, res, next) {
  if ((req as AuthedRequest).currentUserRole !== "Admin") {
    res.status(403).json({ error: { code: "FORBIDDEN", message: "Admin role required" } });
    return;
  }
  next();
}
```

---

## Швидка довідка: ендпойнти для демонстрації

| Призначення | Метод | URL |
|-------------|-------|-----|
| SQLi «до» (вразливий) | GET | `/api/v1/polls/search-vuln?q=<payload>` |
| SQLi «після» (захищений) | GET | `/api/v1/polls/search?q=<query>` |
| IDOR «до» (вразливий) | GET | `/api/v1/notes-vuln/:id` |
| IDOR «після» (захищений) | GET/PUT/DELETE | `/api/v1/notes/:id` |
| XSS демо сторінка | — | `/xss-demo.html` |
| Реєстрація | POST | `/api/v1/auth/register` |
| Логін | POST | `/api/v1/auth/login` |
| Поточний юзер | GET | `/api/v1/auth/me` |
| Logout | POST | `/api/v1/auth/logout` |
| Перевірка заголовків | GET | `/health` (curl -I) |
