import type { ApiError, PollResponseDto, ListMeta } from "./dtos.js";

export type UIStatus = "idle" | "loading" | "success" | "empty" | "error";

export function renderListStatus(status: UIStatus, error: ApiError | null = null): void {
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
    default:
      el.className = "";
      el.innerHTML = "";
  }
}

export function renderPollList(items: PollResponseDto[]): void {
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
          <button type="button" class="btn btn-info detail-btn" data-id="${poll.id}">🔍 Деталі</button>
        </td>
      </tr>
    `,
    )
    .join("");
}

// ── Пагінація ─────────────────────────────────────────────────────────────────

export function renderPagination(meta: ListMeta, onPageChange: (page: number) => void): void {
  const el = document.getElementById("pagination");
  if (!el) return;

  const totalPages = Math.ceil(meta.total / meta.pageSize);
  if (totalPages <= 1) {
    el.innerHTML = "";
    return;
  }

  const buttons: string[] = [];
  buttons.push(
    `<button class="btn btn-secondary page-btn" data-page="${meta.page - 1}" ${meta.page <= 1 ? "disabled" : ""}>‹</button>`,
  );

  for (let i = 1; i <= totalPages; i++) {
    buttons.push(
      `<button class="btn ${i === meta.page ? "btn-primary" : "btn-secondary"} page-btn" data-page="${i}">${i}</button>`,
    );
  }

  buttons.push(
    `<button class="btn btn-secondary page-btn" data-page="${meta.page + 1}" ${meta.page >= totalPages ? "disabled" : ""}>›</button>`,
  );

  el.innerHTML = buttons.join("");

  el.querySelectorAll<HTMLButtonElement>(".page-btn:not([disabled])").forEach((btn) => {
    btn.addEventListener("click", () => {
      const page = parseInt(btn.dataset["page"] ?? "1", 10);
      onPageChange(page);
    });
  });
}

export function renderPageInfo(meta: ListMeta): void {
  const el = document.getElementById("pageInfo");
  if (!el) return;
  const totalPages = Math.ceil(meta.total / meta.pageSize);
  el.textContent = `Сторінка ${meta.page} з ${totalPages} | Всього: ${meta.total}`;
}

// ── Деталі опитування ─────────────────────────────────────────────────────────

export function renderPollDetail(poll: PollResponseDto): void {
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

export function renderDetailStatus(status: UIStatus, error: ApiError | null = null): void {
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

// ── Модальне вікно ────────────────────────────────────────────────────────────

export function openDetailModal(): void {
  document.getElementById("detailModal")?.classList.add("open");
}

export function closeDetailModal(): void {
  document.getElementById("detailModal")?.classList.remove("open");
  const content = document.getElementById("detailContent");
  if (content) content.innerHTML = "";
  renderDetailStatus("idle");
}

// ── Toast-повідомлення ────────────────────────────────────────────────────────

let noticeTimer: ReturnType<typeof setTimeout> | null = null;

export function showNotice(text: string, type: "success" | "error" = "success"): void {
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

export function setFormEnabled(isEnabled: boolean): void {
  const submitBtn = document.getElementById("submitBtn") as HTMLButtonElement | null;
  const resetBtn = document.getElementById("resetBtn") as HTMLButtonElement | null;
  const cancelBtn = document.getElementById("cancelBtn") as HTMLButtonElement | null;
  if (submitBtn) submitBtn.disabled = !isEnabled;
  if (resetBtn) resetBtn.disabled = !isEnabled;
  if (cancelBtn) cancelBtn.style.display = isEnabled ? "none" : "inline-block";
}

export function showFieldError(inputId: string, errorId: string, message: string): void {
  document.getElementById(inputId)?.classList.add("invalid");
  const err = document.getElementById(errorId);
  if (err) err.textContent = message;
}

export function clearFormErrors(): void {
  ["titleInput", "authorInput", "endDateInput", "visibilitySelect", "descInput"].forEach((id) =>
    document.getElementById(id)?.classList.remove("invalid"),
  );
  ["titleError", "authorError", "endDateError", "visibilityError", "descError"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = "";
  });
}

export function resetForm(): void {
  (document.getElementById("pollForm") as HTMLFormElement | null)?.reset();
  const editId = document.getElementById("editId") as HTMLInputElement | null;
  if (editId) editId.value = "";
  const formTitle = document.getElementById("formTitle");
  if (formTitle) formTitle.textContent = "Додати опитування";
  const submitBtn = document.getElementById("submitBtn");
  if (submitBtn) submitBtn.textContent = "Додати";
  clearFormErrors();
}

export interface FormData {
  id: string;
  title: string;
  author: string;
  endDate: string;
  visibility: string;
  description: string;
}

export function fillFormForEdit(poll: PollResponseDto): void {
  (document.getElementById("editId") as HTMLInputElement).value = String(poll.id);
  (document.getElementById("titleInput") as HTMLInputElement).value = poll.title;
  (document.getElementById("authorInput") as HTMLInputElement).value = poll.author;
  (document.getElementById("endDateInput") as HTMLInputElement).value = poll.endDate;
  (document.getElementById("visibilitySelect") as HTMLSelectElement).value = poll.visibility;
  (document.getElementById("descInput") as HTMLTextAreaElement).value = poll.description ?? "";
  const formTitle = document.getElementById("formTitle");
  if (formTitle) formTitle.textContent = "Редагування опитування";
  const submitBtn = document.getElementById("submitBtn");
  if (submitBtn) submitBtn.textContent = "Зберегти";
  clearFormErrors();
}

export function readForm(): FormData {
  return {
    id: (document.getElementById("editId") as HTMLInputElement).value,
    title: (document.getElementById("titleInput") as HTMLInputElement).value.trim(),
    author: (document.getElementById("authorInput") as HTMLInputElement).value.trim(),
    endDate: (document.getElementById("endDateInput") as HTMLInputElement).value,
    visibility: (document.getElementById("visibilitySelect") as HTMLSelectElement).value,
    description: (document.getElementById("descInput") as HTMLTextAreaElement).value.trim(),
  };
}

// ── Хелпери ───────────────────────────────────────────────────────────────────

export function getSearchValue(): string {
  return (document.getElementById("searchInput") as HTMLInputElement | null)?.value.trim() ?? "";
}

export function getSortValue(): string {
  return (document.getElementById("sortSelect") as HTMLSelectElement | null)?.value ?? "default";
}

export function getSortDirValue(): string {
  return (document.getElementById("sortDirSelect") as HTMLSelectElement | null)?.value ?? "asc";
}

export function getVisibilityFilter(): string {
  return (document.getElementById("visibilityFilter") as HTMLSelectElement | null)?.value ?? "";
}

export function getPageSizeValue(): number {
  const val = (document.getElementById("pageSizeSelect") as HTMLSelectElement | null)?.value ?? "10";
  return parseInt(val, 10);
}

function escHtml(str: unknown): string {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("uk-UA");
  } catch {
    return iso;
  }
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("uk-UA");
  } catch {
    return iso;
  }
}
