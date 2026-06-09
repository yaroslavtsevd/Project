/**
 * main.ts — точка входу.
 * Зв'язує apiClient і ui: реалізує всі сценарії роботи.
 *
 * Функціонал:
 *  - CRUD (create / read / update / delete)
 *  - Пагінація на рівні API (page, pageSize)
 *  - Фільтрація: search + visibility (query params до бекенду)
 *  - Сортування через API (sortBy, sortDir)
 *  - AbortController: кнопка «Скасувати» під час запиту
 *  - Кешування: повторне відкриття без запиту (30 с)
 *  - Retry: автоматично для 429/503
 *  - Обробка всіх «поганих» сценаріїв (network down, 500, 400 validation)
 */
import { getPollList, getPollById, createPoll, updatePoll, deletePoll, cancelCurrentRequest, } from "./apiClient.js";
import { renderListStatus, renderPollList, renderPollDetail, renderDetailStatus, renderPagination, renderPageInfo, openDetailModal, closeDetailModal, showNotice, setFormEnabled, showFieldError, clearFormErrors, resetForm, fillFormForEdit, readForm, getSearchValue, getSortValue, getSortDirValue, getVisibilityFilter, getPageSizeValue, } from "./ui.js";
const state = {
    polls: [],
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
};
// ── Завантаження списку з пагінацією та фільтрами ─────────────────────────────
async function loadList(page = state.currentPage) {
    renderListStatus("loading");
    const search = getSearchValue();
    const sortRaw = getSortValue();
    const sortDir = getSortDirValue();
    const visibility = getVisibilityFilter();
    const pageSize = getPageSizeValue();
    // Маппінг значень select → API sortBy
    const sortByMap = {
        title: "title",
        author: "author",
        dateAsc: "endDate",
        dateDesc: "endDate",
        createdAt: "createdAt",
        default: "",
    };
    const sortBy = sortByMap[sortRaw];
    // Якщо вибрано dateDesc — sortDir ігнорується і береться з select
    const resolvedSortDir = sortRaw === "dateDesc" ? "desc" : sortRaw === "dateAsc" ? "asc" : sortDir;
    try {
        const response = await getPollList({
            page,
            pageSize,
            sortBy: sortBy || undefined,
            sortDir: resolvedSortDir,
            search: search || undefined,
            visibility: visibility || undefined,
        });
        const items = response.data;
        const meta = response.meta;
        state.polls = items;
        state.currentPage = meta.page;
        state.totalPages = Math.ceil(meta.total / meta.pageSize);
        state.totalItems = meta.total;
        if (items.length === 0) {
            renderPollList([]);
            renderListStatus("empty");
            renderPageInfo(meta);
            renderPagination(meta, (p) => loadList(p));
            return;
        }
        renderPollList(items);
        renderListStatus("success");
        renderPageInfo(meta);
        renderPagination(meta, (p) => loadList(p));
    }
    catch (err) {
        renderPollList([]);
        renderListStatus("error", err);
    }
}
// ── Деталі опитування ──────────────────────────────────────────────────────────
async function showDetail(id) {
    openDetailModal();
    renderDetailStatus("loading");
    document.getElementById("detailContent").innerHTML = "";
    try {
        const poll = await getPollById(id);
        renderDetailStatus("success");
        renderPollDetail(poll);
    }
    catch (err) {
        renderDetailStatus("error", err);
    }
}
function validateForm(dto) {
    clearFormErrors();
    let valid = true;
    if (dto.title.length < 3) {
        showFieldError("titleInput", "titleError", "Назва має містити мінімум 3 символи.");
        valid = false;
    }
    else if (dto.title.length > 50) {
        showFieldError("titleInput", "titleError", "Назва не може перевищувати 50 символів.");
        valid = false;
    }
    if (dto.author.length < 2) {
        showFieldError("authorInput", "authorError", "Вкажіть автора (мін. 2 символи).");
        valid = false;
    }
    if (!dto.endDate) {
        showFieldError("endDateInput", "endDateError", "Оберіть дату завершення.");
        valid = false;
    }
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(dto.endDate)) {
        showFieldError("endDateInput", "endDateError", "Формат дати: рррр-мм-дд.");
        valid = false;
    }
    if (!dto.visibility) {
        showFieldError("visibilitySelect", "visibilityError", "Оберіть видимість.");
        valid = false;
    }
    if (dto.description.length > 200) {
        showFieldError("descInput", "descError", "Опис не може перевищувати 200 символів.");
        valid = false;
    }
    return valid;
}
// ── Обробник форми ────────────────────────────────────────────────────────────
async function handleFormSubmit(event) {
    event.preventDefault();
    const dto = readForm();
    if (!validateForm(dto))
        return;
    setFormEnabled(false);
    try {
        if (dto.id) {
            await updatePoll(parseInt(dto.id, 10), {
                title: dto.title,
                author: dto.author,
                endDate: dto.endDate,
                visibility: dto.visibility,
                description: dto.description,
            });
            showNotice("✅ Опитування оновлено", "success");
        }
        else {
            await createPoll({
                title: dto.title,
                author: dto.author,
                endDate: dto.endDate,
                visibility: dto.visibility,
                description: dto.description,
            });
            showNotice("✅ Опитування створено", "success");
        }
        resetForm();
        await loadList(1);
    }
    catch (err) {
        handleApiError(err, "збереження");
    }
    finally {
        setFormEnabled(true);
    }
}
// ── Видалення ─────────────────────────────────────────────────────────────────
async function handleDelete(id) {
    if (!confirm("Видалити це опитування? Дію не можна скасувати."))
        return;
    try {
        await deletePoll(id);
        showNotice("🗑 Опитування видалено", "success");
        // Якщо на поточній сторінці більше немає елементів — перейти на попередню
        const newPage = state.polls.length <= 1 && state.currentPage > 1
            ? state.currentPage - 1
            : state.currentPage;
        await loadList(newPage);
    }
    catch (err) {
        handleApiError(err, "видалення");
    }
}
// ── Уніфікована обробка помилок API ──────────────────────────────────────────
function handleApiError(err, action) {
    // code — машинний код помилки з бекенду (наприклад "VALIDATION_ERROR", "NOT_FOUND")
    const codeLabel = err.code ? ` [${err.code}]` : "";
    if (err.status === 400) {
        showNotice(`⚠ Помилка валідації (400)${codeLabel}: ${err.details || err.message}`, "error");
    }
    else if (err.status === 404) {
        showNotice(`⚠ Не знайдено (404)${codeLabel}: ${err.message}`, "error");
    }
    else if (err.status === 409) {
        showNotice(`⚠ Конфлікт (409)${codeLabel}: ${err.message}`, "error");
    }
    else if (err.status === 500) {
        showNotice(`🔥 Внутрішня помилка сервера (500)${codeLabel}. Спробуйте пізніше.`, "error");
    }
    else if (err.status === 0) {
        if (err.message.includes("скасовано") || err.message.includes("таймаут")) {
            showNotice(`⏱ ${err.message}`, "error");
        }
        else {
            showNotice(`🔌 ${err.message} — перевірте, чи запущений бекенд.`, "error");
        }
    }
    else {
        showNotice(`⚠ Помилка ${action} (${err.status})${codeLabel}: ${err.message}`, "error");
    }
}
// ── Реєстрація подій ──────────────────────────────────────────────────────────
function bindEvents() {
    // Форма
    document.getElementById("pollForm")?.addEventListener("submit", handleFormSubmit);
    document.getElementById("resetBtn")?.addEventListener("click", resetForm);
    // Кнопка скасування запиту
    document.getElementById("cancelBtn")?.addEventListener("click", () => {
        cancelCurrentRequest();
        setFormEnabled(true);
        showNotice("⏹ Запит скасовано", "error");
    });
    // Фільтри і сортування — завантажуємо з сервера
    document.getElementById("searchInput")?.addEventListener("input", () => loadList(1));
    document.getElementById("sortSelect")?.addEventListener("change", () => loadList(1));
    document.getElementById("sortDirSelect")?.addEventListener("change", () => loadList(1));
    document.getElementById("visibilityFilter")?.addEventListener("change", () => loadList(1));
    document.getElementById("pageSizeSelect")?.addEventListener("change", () => loadList(1));
    // Делегування — кнопки у таблиці
    document.getElementById("pollsTableBody")?.addEventListener("click", async (e) => {
        const target = e.target;
        if (target.classList.contains("delete-btn")) {
            const id = parseInt(target.dataset["id"] ?? "0", 10);
            await handleDelete(id);
        }
        if (target.classList.contains("edit-btn")) {
            const id = parseInt(target.dataset["id"] ?? "0", 10);
            const poll = state.polls.find((p) => p.id === id);
            if (poll)
                fillFormForEdit(poll);
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
        if (target.classList.contains("detail-btn")) {
            const id = parseInt(target.dataset["id"] ?? "0", 10);
            await showDetail(id);
        }
    });
    // Подвійний клік по рядку — деталі
    document.getElementById("pollsTable")?.addEventListener("dblclick", async (e) => {
        const row = e.target.closest("tr[data-id]");
        if (row) {
            const id = parseInt(row.dataset["id"] ?? "0", 10);
            await showDetail(id);
        }
    });
    // Модальне вікно
    document.getElementById("closeDetailBtn")?.addEventListener("click", closeDetailModal);
    document.getElementById("detailModal")?.addEventListener("click", (e) => {
        if (e.target === e.currentTarget)
            closeDetailModal();
    });
    // Клавіша Escape — закрити модальне вікно
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape")
            closeDetailModal();
    });
}
// ── Ініціалізація ─────────────────────────────────────────────────────────────
async function init() {
    bindEvents();
    await loadList(1);
}
init();
