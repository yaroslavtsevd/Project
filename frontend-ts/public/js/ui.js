/**
 * ui.ts — усі операції з DOM.
 * Не містить fetch-логіки, не знає про HTTP.
 */
export function renderListStatus(status, error = null) {
    const el = document.getElementById("listStatus");
    if (!el)
        return;
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
export function renderPollList(items) {
    const tbody = document.getElementById("pollsTableBody");
    if (!tbody)
        return;
    if (!items || items.length === 0) {
        tbody.innerHTML = "";
        return;
    }
    tbody.innerHTML = items
        .map((poll) => `
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
    `)
        .join("");
}
// ── Пагінація ─────────────────────────────────────────────────────────────────
export function renderPagination(meta, onPageChange) {
    const el = document.getElementById("pagination");
    if (!el)
        return;
    const totalPages = Math.ceil(meta.total / meta.pageSize);
    if (totalPages <= 1) {
        el.innerHTML = "";
        return;
    }
    const buttons = [];
    buttons.push(`<button class="btn btn-secondary page-btn" data-page="${meta.page - 1}" ${meta.page <= 1 ? "disabled" : ""}>‹</button>`);
    for (let i = 1; i <= totalPages; i++) {
        buttons.push(`<button class="btn ${i === meta.page ? "btn-primary" : "btn-secondary"} page-btn" data-page="${i}">${i}</button>`);
    }
    buttons.push(`<button class="btn btn-secondary page-btn" data-page="${meta.page + 1}" ${meta.page >= totalPages ? "disabled" : ""}>›</button>`);
    el.innerHTML = buttons.join("");
    el.querySelectorAll(".page-btn:not([disabled])").forEach((btn) => {
        btn.addEventListener("click", () => {
            const page = parseInt(btn.dataset["page"] ?? "1", 10);
            onPageChange(page);
        });
    });
}
export function renderPageInfo(meta) {
    const el = document.getElementById("pageInfo");
    if (!el)
        return;
    const totalPages = Math.ceil(meta.total / meta.pageSize);
    el.textContent = `Сторінка ${meta.page} з ${totalPages} | Всього: ${meta.total}`;
}
// ── Деталі опитування ─────────────────────────────────────────────────────────
export function renderPollDetail(poll) {
    const el = document.getElementById("detailContent");
    if (!el)
        return;
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
    if (!el)
        return;
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
export function openDetailModal() {
    document.getElementById("detailModal")?.classList.add("open");
}
export function closeDetailModal() {
    document.getElementById("detailModal")?.classList.remove("open");
    const content = document.getElementById("detailContent");
    if (content)
        content.innerHTML = "";
    renderDetailStatus("idle");
}
// ── Toast-повідомлення ────────────────────────────────────────────────────────
let noticeTimer = null;
export function showNotice(text, type = "success") {
    const el = document.getElementById("notice");
    if (!el)
        return;
    if (noticeTimer)
        clearTimeout(noticeTimer);
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
    const submitBtn = document.getElementById("submitBtn");
    const resetBtn = document.getElementById("resetBtn");
    const cancelBtn = document.getElementById("cancelBtn");
    if (submitBtn)
        submitBtn.disabled = !isEnabled;
    if (resetBtn)
        resetBtn.disabled = !isEnabled;
    if (cancelBtn)
        cancelBtn.style.display = isEnabled ? "none" : "inline-block";
}
export function showFieldError(inputId, errorId, message) {
    document.getElementById(inputId)?.classList.add("invalid");
    const err = document.getElementById(errorId);
    if (err)
        err.textContent = message;
}
export function clearFormErrors() {
    ["titleInput", "authorInput", "endDateInput", "visibilitySelect", "descInput"].forEach((id) => document.getElementById(id)?.classList.remove("invalid"));
    ["titleError", "authorError", "endDateError", "visibilityError", "descError"].forEach((id) => {
        const el = document.getElementById(id);
        if (el)
            el.textContent = "";
    });
}
export function resetForm() {
    document.getElementById("pollForm")?.reset();
    const editId = document.getElementById("editId");
    if (editId)
        editId.value = "";
    const formTitle = document.getElementById("formTitle");
    if (formTitle)
        formTitle.textContent = "Додати опитування";
    const submitBtn = document.getElementById("submitBtn");
    if (submitBtn)
        submitBtn.textContent = "Додати";
    clearFormErrors();
}
export function fillFormForEdit(poll) {
    document.getElementById("editId").value = String(poll.id);
    document.getElementById("titleInput").value = poll.title;
    document.getElementById("authorInput").value = poll.author;
    document.getElementById("endDateInput").value = poll.endDate;
    document.getElementById("visibilitySelect").value = poll.visibility;
    document.getElementById("descInput").value = poll.description ?? "";
    const formTitle = document.getElementById("formTitle");
    if (formTitle)
        formTitle.textContent = "Редагування опитування";
    const submitBtn = document.getElementById("submitBtn");
    if (submitBtn)
        submitBtn.textContent = "Зберегти";
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
// ── Хелпери ───────────────────────────────────────────────────────────────────
export function getSearchValue() {
    return document.getElementById("searchInput")?.value.trim() ?? "";
}
export function getSortValue() {
    return document.getElementById("sortSelect")?.value ?? "default";
}
export function getSortDirValue() {
    return document.getElementById("sortDirSelect")?.value ?? "asc";
}
export function getVisibilityFilter() {
    return document.getElementById("visibilityFilter")?.value ?? "";
}
export function getPageSizeValue() {
    const val = document.getElementById("pageSizeSelect")?.value ?? "10";
    return parseInt(val, 10);
}
function escHtml(str) {
    return String(str ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
function formatDate(iso) {
    if (!iso)
        return "—";
    try {
        return new Date(iso).toLocaleDateString("uk-UA");
    }
    catch {
        return iso;
    }
}
function formatDateTime(iso) {
    if (!iso)
        return "—";
    try {
        return new Date(iso).toLocaleString("uk-UA");
    }
    catch {
        return iso;
    }
}
