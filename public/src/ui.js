/**
 * ui.js — усі операції з DOM.
 * Не містить fetch-логіки, не знає про HTTP.
 */

// ── Стани списку ──────────────────────────────────────────────────────────────

/**
 * Відображає статус блоку списку: loading / empty / error / success (порожньо).
 * @param {"loading"|"empty"|"error"|"success"} status
 * @param {{ message: string, details?: string, status?: number }|null} [error]
 */
export function renderListStatus(status, error = null) {
  const el = document.getElementById("listStatus");
  if (!el) return;

  switch (status) {
    case "loading":
      el.className = "status-message loading";
      el.innerHTML = `<span class="spinner"></span> Завантаження…`;
      break;
    case "empty":
      el.className = "status-message empty";
      el.innerHTML = `<span>📭</span> Опитувань поки немає. Додайте перше!`;
      break;
    case "error":
      el.className = "status-message error";
      el.innerHTML = `
        <strong>⚠ Помилка завантаження</strong>
        <span class="err-msg">(${error?.status ?? "–"}): ${error?.message ?? "невідома помилка"}</span>
        ${error?.details ? `<small class="err-details">${error.details}</small>` : ""}
      `;
      break;
    case "success":
    default:
      el.className = "";
      el.innerHTML = "";
  }
}

/**
 * Рендерить список опитувань у таблицю.
 * @param {Array} items
 */
export function renderPollList(items) {
  const tbody = document.getElementById("pollsTableBody");
  if (!tbody) return;

  if (!items || items.length === 0) {
    tbody.innerHTML = "";
    return;
  }

  tbody.innerHTML = items
    .map(
      (poll) => `
      <tr data-id="${poll.id}">
        <td>
          <strong class="poll-title">${escHtml(poll.title)}</strong>
          ${poll.description ? `<br><small class="poll-desc">${escHtml(poll.description)}</small>` : ""}
        </td>
        <td>${escHtml(poll.author)}</td>
        <td>${formatDate(poll.endDate)}</td>
        <td>
          <span class="badge badge-${poll.visibility === "Public" ? "public" : "private"}">
            ${poll.visibility === "Public" ? "Публічне" : "Приватне"}
          </span>
        </td>
        <td class="actions">
          <button type="button" class="btn btn-secondary edit-btn" data-id="${poll.id}">✏ Редагувати</button>
          <button type="button" class="btn btn-danger delete-btn" data-id="${poll.id}">🗑 Видалити</button>
        </td>
      </tr>
    `,
    )
    .join("");
}

// ── Деталі опитування ─────────────────────────────────────────────────────────

/**
 * Відображає деталі одного опитування в модальному вікні.
 * @param {Object} poll
 */
export function renderPollDetail(poll) {
  const el = document.getElementById("detailContent");
  if (!el) return;

  el.innerHTML = `
    <dl class="detail-grid">
      <dt>ID</dt>             <dd>${poll.id}</dd>
      <dt>Назва</dt>          <dd>${escHtml(poll.title)}</dd>
      <dt>Автор</dt>          <dd>${escHtml(poll.author)}</dd>
      <dt>Дата завершення</dt><dd>${formatDate(poll.endDate)}</dd>
      <dt>Видимість</dt>      <dd>${poll.visibility === "Public" ? "Публічне" : "Приватне"}</dd>
      <dt>Опис</dt>           <dd>${escHtml(poll.description || "—")}</dd>
      <dt>Створено</dt>       <dd>${formatDateTime(poll.createdAt)}</dd>
      <dt>Оновлено</dt>       <dd>${formatDateTime(poll.updatedAt)}</dd>
    </dl>
  `;
}

export function renderDetailStatus(status, error = null) {
  const el = document.getElementById("detailStatus");
  if (!el) return;

  switch (status) {
    case "loading":
      el.className = "status-message loading";
      el.innerHTML = `<span class="spinner"></span> Завантаження деталей…`;
      break;
    case "error":
      el.className = "status-message error";
      el.innerHTML = `
        <strong>⚠ Не вдалося завантажити</strong>
        <span class="err-msg">(${error?.status ?? "–"}): ${error?.message ?? "невідома помилка"}</span>
        ${error?.details ? `<small class="err-details">${error.details}</small>` : ""}
      `;
      break;
    default:
      el.className = "";
      el.innerHTML = "";
  }
}

// ── Модальне вікно деталей ────────────────────────────────────────────────────

export function openDetailModal() {
  const modal = document.getElementById("detailModal");
  if (modal) modal.classList.add("open");
}

export function closeDetailModal() {
  const modal = document.getElementById("detailModal");
  if (modal) modal.classList.remove("open");
  const el = document.getElementById("detailContent");
  if (el) el.innerHTML = "";
  renderDetailStatus("success");
}

// ── Повідомлення (toast) ──────────────────────────────────────────────────────

let noticeTimer = null;

/**
 * Показує тимчасове повідомлення.
 * @param {string} text
 * @param {"success"|"error"} [type="success"]
 */
export function showNotice(text, type = "success") {
  const el = document.getElementById("notice");
  if (!el) return;
  if (noticeTimer) clearTimeout(noticeTimer);

  el.className = `notice notice-${type}`;
  el.innerHTML = text;
  el.style.display = "block";

  noticeTimer = setTimeout(() => {
    el.style.display = "none";
    el.innerHTML = "";
  }, 4000);
}

// ── Форма ─────────────────────────────────────────────────────────────────────

export function setFormEnabled(isEnabled) {
  const btn = document.getElementById("submitBtn");
  const resetBtn = document.getElementById("resetBtn");
  if (btn) btn.disabled = !isEnabled;
  if (resetBtn) resetBtn.disabled = !isEnabled;
}

export function showFieldError(inputId, errorId, message) {
  const input = document.getElementById(inputId);
  const errEl = document.getElementById(errorId);
  if (input) input.classList.add("invalid");
  if (errEl) errEl.textContent = message;
}

export function clearFormErrors() {
  ["titleInput", "authorInput", "endDateInput", "visibilitySelect", "descInput"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.classList.remove("invalid");
  });
  ["titleError", "authorError", "endDateError", "visibilityError", "descError"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = "";
  });
}

export function resetForm() {
  const form = document.getElementById("pollForm");
  if (form) form.reset();
  const editId = document.getElementById("editId");
  if (editId) editId.value = "";
  const formTitle = document.getElementById("formTitle");
  if (formTitle) formTitle.textContent = "Додати опитування";
  const submitBtn = document.getElementById("submitBtn");
  if (submitBtn) submitBtn.textContent = "Додати";
  clearFormErrors();
}

export function fillFormForEdit(poll) {
  document.getElementById("editId").value = poll.id;
  document.getElementById("titleInput").value = poll.title;
  document.getElementById("authorInput").value = poll.author;
  document.getElementById("endDateInput").value = poll.endDate;
  document.getElementById("visibilitySelect").value = poll.visibility;
  document.getElementById("descInput").value = poll.description || "";
  document.getElementById("formTitle").textContent = "Редагування опитування";
  document.getElementById("submitBtn").textContent = "Зберегти";
  clearFormErrors();
}

export function readForm() {
  return {
    id: document.getElementById("editId").value,
    title: document.getElementById("titleInput").value.trim(),
    author: document.getElementById("authorInput").value.trim(),
    endDate: document.getElementById("endDateInput").value,
    visibility: document.getElementById("visibilitySelect").value,
    description: document.getElementById("descInput").value.trim(),
  };
}

// ── Пошук / сортування ────────────────────────────────────────────────────────

export function getSearchValue() {
  return document.getElementById("searchInput")?.value.toLowerCase().trim() ?? "";
}

export function getSortValue() {
  return document.getElementById("sortSelect")?.value ?? "default";
}

// ── Хелпери ───────────────────────────────────────────────────────────────────

function escHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("uk-UA");
  } catch {
    return iso;
  }
}

function formatDateTime(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("uk-UA");
  } catch {
    return iso;
  }
}
