# Лабораторна робота №5 — Уразливості і захист
## Yaroslavtsev · Version 1.0.0

---

## Зміст

| # | Сценарій | Статус |
|---|----------|--------|
| A | SQL Injection (SQLi) | ✅ Виправлено |
| Б | XSS (Збережений) | ✅ Виправлено |
| В | Broken Access Control / IDOR | ✅ Виправлено |
| Г | Security Misconfiguration | ✅ Виправлено |
| Д | Повна автентифікація (бонус) | ✅ Реалізовано |

---

## Таблиця ризиків

| Уразливість | Наслідок | Виправлення |
|-------------|----------|-------------|
| SQL Injection | Витік/маніпуляція даними в БД, обхід фільтрів | Параметризовані запити (`?` placeholders) замість конкатенації рядків |
| Stored XSS | Виконання довільного JS у браузері жертви | Безпечний рендер через `textContent` / DOM API замість `innerHTML` |
| IDOR | Несанкціонований доступ до чужих ресурсів | Серверна перевірка `ownerUserId = currentUserId` на READ/UPDATE/DELETE |
| Misconfiguration | Розкриття внутрішніх деталей, відсутність захисних заголовків | Security headers, приховання stack trace, обмежений CORS |

---

## Загальна архітектура безпеки

### Ідентифікація/Автентифікація

Middleware `src/middleware/requireAuth.ts` підтримує два режими:

| Режим | Заголовок | Перевірка |
|-------|-----------|-----------|
| Bearer token (бонус) | `Authorization: Bearer <token>` | Таблиця `AuthSessions` в SQLite |
| Demo mode (базова) | `X-Demo-UserId: <id>` | Таблиця `Users` в SQLite |

| Умова | Відповідь |
|-------|-----------|
| Немає жодного заголовка | `401 UNAUTHORIZED` |
| Невалідний/прострочений Bearer token | `401 UNAUTHORIZED` |
| `X-Demo-UserId` не ціле число або ≤ 0 | `401 UNAUTHORIZED` |
| Користувач не існує в БД | `401 UNAUTHORIZED` |
| Все ок | `req.currentUserId` встановлено, `next()` |

---

## Сценарій A — SQL Injection (SQLi)

### Поверхня атаки

`GET /api/v1/polls/search?q=<user-input>` → `src/repositories/polls.repository.ts`

### Було (уразливо)

```typescript
const sql = `SELECT ... FROM Polls WHERE title LIKE '%${q}%' AND deletedAt IS NULL`;
const rows = await all<...>(sql);  // q вставляється як SQL-код
```

**Чому ін'єкція проходить:** `q` стає частиною SQL. Спецсимволи можуть змінити логіку запиту.

### Відтворення

```
GET /api/v1/polls/search?q=семестр → 200, знайдено 1 poll ✓ (нормальний)

GET /api/v1/polls/search?q=%25%27%20OR%20%271%27%3D%271
SQL: WHERE title LIKE '%%' OR '1'='1%' → повертає ВСІ записи (витік!)

GET /api/v1/polls/search?q=' → 500 (синтаксична помилка SQLite)
```

### Виправлення

```typescript
// FIX: параметризований запит — q передається як дані, не як SQL-код
const sql = `SELECT ... FROM Polls WHERE title LIKE ? AND deletedAt IS NULL LIMIT 20;`;
const rows = await all<...>(sql, [`%${q}%`]);
```

Для `ORDER BY` (параметри не підходять для назв колонок) використано **allowlist**:
```typescript
const allowed = new Set(["date", "title", "rating"]);
const sortColumn = allowed.has(sort) ? sort : "date";
```

### Перевірка виправлення

```
GET /api/v1/polls/search?q=%25%27%20OR%20%271%27%3D%271 → 200 { data: [] }  ← рядок = текст, не SQL
GET /api/v1/polls/search?q=' → 200 { data: [] }  ← не 500
GET /api/v1/polls/search?q=семестр → 200 { data: [{...}] }  ← функціонал працює
```

---

## Сценарій Б — XSS (Stored / Збережений)

### Поверхня атаки

- `POST /api/v1/polls/:id/comments` — зберігає коментар у `PollComments`
- `GET /api/v1/polls/:id/comments` — повертає коментарі
- Демо сторінка: `public/xss-demo.html`

### Було (уразливо)

```javascript
// ВРАЗЛИВО: innerHTML інтерпретує дані як HTML
for (const c of comments) {
  const li = document.createElement('li');
  li.innerHTML = c.body;  // якщо body = '<img src=x onerror="...">', XSS виконується
  ul.appendChild(li);
}
```

**Чому XSS виникає:** `innerHTML` наказує браузеру розпарсити рядок як HTML. Теги та обробники подій виконуються.

### Відтворення

```http
POST /api/v1/polls/1/comments
X-Demo-UserId: 1
{ "body": "<img src=x onerror="document.title='XSS!'">" }
→ 201 (payload збережено у БД)

GET /api/v1/polls/1/comments → 200, payload повертається з БД

Рендер через innerHTML → браузер виконує onerror → title вкладки змінюється → XSS підтверджено
```

### Виправлення

```javascript
// БЕЗПЕЧНО: DOM API — дані є текстом, не HTML
for (const c of comments) {
  const li   = document.createElement('li');
  const time = document.createElement('small');
  time.textContent = new Date(c.createdAt).toLocaleString('uk-UA') + ': ';
  const text = document.createTextNode(c.body);  // createTextNode = plain text
  li.appendChild(time);
  li.appendChild(text);
  ul.appendChild(li);
}
```

`textContent` і `createTextNode` не парсять HTML — `<img ...>` відображається як буквальний текст.

### Перевірка виправлення

```
1. /xss-demo.html → ввести <img src=x onerror="document.title='XSS!'">
2. "Додати (вразливо)" → title вкладки змінився → XSS виконався (демонстрація "до")
3. "Додати (безпечно)" → у списку видно текст <img ...> → XSS не виконався ("після")
4. Серверний тест: збережений payload → vuln panel = XSS, safe panel = текст
```

---

## Сценарій В — Broken Access Control / IDOR

### Поверхня атаки

`PersonalNotes` — нотатки з `ownerUserId`. Операції GET/:id, PUT/:id, DELETE/:id.

### Було (уразливо)

```typescript
// ВРАЗЛИВО: перевірка лише по id, без ownerUserId
db.get(`SELECT * FROM Notes WHERE id = ?`, [req.params.id], (err, note) => {
  res.json(note);  // будь-який авт. користувач читає будь-яку нотатку
});
```

### Відтворення

```http
# User 2 (Maria) читає нотатку User 1 (Oksana) через вразливий endpoint:
GET /api/v1/notes-vuln/1
X-Demo-UserId: 2
→ 200 { data: { id:1, ownerUserId:1, title:"Мої нотатки...", ... } }  ← IDOR!
```

### Виправлення

Серверна перевірка `ownerUserId = currentUserId` на **кожній** операції через SQL:

```typescript
// READ — WHERE id = ? AND ownerUserId = ?
// UPDATE — WHERE id = ? AND ownerUserId = ?
// DELETE — WHERE id = ? AND ownerUserId = ?
```

При невдачі → `404 NOT_FOUND` (не розкриває існування чужого ресурсу).

### Перевірка виправлення

```http
GET /api/v1/notes/1  (X-Demo-UserId: 2) → 404  ← ✅ чужий read заблоковано
PUT /api/v1/notes/1  (X-Demo-UserId: 2) → 404  ← ✅ чужий update заблоковано
DELETE /api/v1/notes/1 (X-Demo-UserId: 2) → 404 ← ✅ чужий delete заблоковано
GET /api/v1/notes/1  (X-Demo-UserId: 1) → 200  ← ✅ власний доступ працює
GET /api/v1/notes/3  (X-Demo-UserId: 2) → 200  ← ✅ Maria читає свою нотатку
```

---

## Сценарій Г — Security Misconfiguration

### Безпечні HTTP-заголовки (`src/app.ts`)

```typescript
res.setHeader("X-Content-Type-Options", "nosniff");       // захист від MIME sniffing
res.setHeader("X-Frame-Options", "DENY");                 // захист від clickjacking (iframe)
res.setHeader("Referrer-Policy", "no-referrer");          // не передавати Referer
res.setHeader("Content-Security-Policy", "default-src 'self'; ...");  // CSP
```

**Перевірка:**
```bash
curl -I http://localhost:3000/health
# X-Content-Type-Options: nosniff ✅
# X-Frame-Options: DENY ✅
# Referrer-Policy: no-referrer ✅
# Content-Security-Policy: default-src 'self'; ... ✅
```

### Централізована обробка помилок (без stack trace)

```typescript
// 500 — клієнт бачить лише загальне повідомлення
res.status(500).json({
  error: { code: "INTERNAL_SERVER_ERROR", message: "Unexpected server error", details: null }
  // Без: stack trace, шляхів файлів, назв таблиць, внутрішніх деталей
});
```

### CORS — обмежений origin

```typescript
// Тільки явно дозволені origins, НЕ "*"
const allowedOrigins = ["http://localhost:5500", "http://localhost:5173", "http://localhost:3000"];
```

### Коди статусів

| Ситуація | Код | Code |
|----------|-----|------|
| Немає авторизації | 401 | `UNAUTHORIZED` |
| Чужий ресурс / не існує | 404 | `NOT_FOUND` |
| Невалідні дані | 400 | `VALIDATION_ERROR` |
| Дублікат | 409 | `CONFLICT` |
| Brute force | 429 | `TOO_MANY_REQUESTS` |
| Внутрішня помилка | 500 | `INTERNAL_SERVER_ERROR` |

---

## Бонус — Повна автентифікація

### Нові файли

- `src/services/auth.service.ts` — PBKDF2, сесії, rate-limiting
- `src/middleware/requireAuth.ts` — unified middleware (Bearer + X-Demo-UserId)
- `src/controllers/auth.controller.ts` — register/login/logout/me/sessions
- `src/routes/auth.routes.ts` — `/api/v1/auth/*`
- `migrations/008_add_auth.sql` — `AuthSessions`, `LoginAttempts`, колонки хешу

### Технічні деталі

| Аспект | Реалізація |
|--------|-----------|
| Хешування паролів | PBKDF2-SHA256, 100 000 ітерацій, 32-byte, унікальна сіль (16 bytes random) |
| Timing attack захист | `crypto.timingSafeEqual` для порівняння хешів |
| Токен | `crypto.randomBytes(32)` → 64-char hex |
| Зберігання | `AuthSessions` table, TTL 24h |
| Cookie | `HttpOnly; SameSite=strict` |
| Brute-force | ≥5 невдалих за 15 хв → 429 |
| User enumeration | Однакове повідомлення незалежно від існування email |
| Зовнішні бібліотеки | Жодних — лише Node.js built-in `crypto` |

### Ендпойнти

| Метод | Шлях | Опис |
|-------|------|------|
| POST | `/api/v1/auth/register` | Реєстрація нового користувача |
| POST | `/api/v1/auth/login` | Логін → token + HttpOnly cookie |
| POST | `/api/v1/auth/logout` | Видалення сесії з БД |
| GET | `/api/v1/auth/me` | Поточний користувач (requires auth) |
| GET | `/api/v1/auth/sessions` | Активні сесії (requires auth) |

### Seed credentials

```
oksana@example.com  / Password1!   (Student, id=1)
maria@example.com   / Password2!   (Student, id=2)
ivan@example.com    / Password3!   (Student, id=3)
andrii@example.com  / Password4!   (Teacher, id=4)
admin@example.com   / AdminPass1!  (Admin,   id=5)
```

---

## Security Regression Tests

Файл: `security-regression.http` — повний набір запитів (VS Code REST Client / httpYac).

| Тест | Сценарій | Очікуваний результат |
|------|----------|---------------------|
| 1.1 | SQLi — нормальний пошук | 200 + релевантні результати |
| 1.2 | SQLi — тавтологія OR 1=1 | 200 + `[]` (не дамп БД) |
| 1.3 | SQLi — одинарна лапка | 200 + `[]` (не 500) |
| 2.1 | XSS — зберегти payload | 201 |
| 2.2 | XSS — отримати коментарі | 200, payload = текст у JSON |
| 2.3 | XSS — нормальний коментар | 201 (функціонал не зламано) |
| 3.2 | IDOR — чужий GET | 404 |
| 3.5 | IDOR — чужий PUT | 404 |
| 3.7 | IDOR — чужий DELETE | 404 |
| 3.1 | IDOR — власний GET | 200 |
| 3.8 | Auth — без заголовка | 401 |
| 5.2 | Auth — логін | 200 + token |
| 5.3 | Auth — невірний пароль | 401 |
| 5.4 | Auth — brute force | 429 після 5 спроб |
| 5.9 | Auth — logout invalidates | 401 |

---

## Посилання

Репозиторій: [GitHub]  
Тег фінальної версії: `1.0.0`
