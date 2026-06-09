/**
 * main.js — точка входу.
 * Керує: авторизацією (логін/реєстрація/вихід) та CRUD опитувань.
 */

import {
  apiLogin, apiRegister, apiLogout,
  getPollList, getPollById, createPoll, updatePoll, deletePoll,
  isLoggedIn, getCurrentUser,
} from "./apiClient.js";

import {
  renderListStatus, renderPollList, renderPollDetail,
  renderDetailStatus, openDetailModal, closeDetailModal,
  showNotice, setFormEnabled, showFieldError, clearFormErrors,
  resetForm, fillFormForEdit, readForm, getSearchValue, getSortValue,
} from "./ui.js";

// ── Стан ─────────────────────────────────────────────────────────────────────
const state = { polls: [] };

// ── Утиліти відображення секцій ──────────────────────────────────────────────

function showApp() {
  const user = getCurrentUser();
  document.getElementById("authSection").style.display = "none";
  document.getElementById("appMain").style.display     = "";

  // Заповнити user bar
  const nameEl = document.getElementById("userBarName");
  const roleEl = document.getElementById("userBarRole");
  nameEl.textContent = user?.name ?? user?.email ?? "Користувач";
  roleEl.textContent = user?.role ?? "";
  roleEl.className   = "role-badge role-" + (user?.role ?? "").toLowerCase();
  document.getElementById("userBar").style.display = "";
}

function showAuth() {
  document.getElementById("authSection").style.display = "";
  document.getElementById("appMain").style.display     = "none";
  document.getElementById("userBar").style.display     = "none";
}

// ── Логін ─────────────────────────────────────────────────────────────────────

async function handleLogin() {
  const email    = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  if (!email || !password) {
    showNotice("⚠ Введіть email та пароль", "error");
    return;
  }

  const btn = document.getElementById("loginBtn");
  btn.disabled = true;
  btn.textContent = "Вхід…";

  try {
    const user = await apiLogin(email, password);
    showNotice(`✅ Вітаємо, ${user.name}!`, "success");
    showApp();
    await loadList();
  } catch (err) {
    if (err.status === 429) {
      showNotice("🚫 Забагато невдалих спроб. Зачекайте 15 хвилин.", "error");
    } else if (err.status === 401) {
      showNotice("❌ Невірні облікові дані", "error");
    } else {
      showNotice(`⚠ Помилка входу (${err.status}): ${err.message}`, "error");
    }
  } finally {
    btn.disabled = false;
    btn.textContent = "Увійти";
  }
}

// ── Реєстрація ────────────────────────────────────────────────────────────────

async function handleRegister() {
  const name     = document.getElementById("regName").value.trim();
  const email    = document.getElementById("regEmail").value.trim();
  const password = document.getElementById("regPassword").value;

  if (!name || name.length < 2) {
    showNotice("⚠ Ім'я має бути не менше 2 символів", "error"); return;
  }
  if (!email || !email.includes("@")) {
    showNotice("⚠ Введіть коректний email", "error"); return;
  }
  if (!password || password.length < 8) {
    showNotice("⚠ Пароль має бути не менше 8 символів", "error"); return;
  }

  const btn = document.getElementById("registerBtn");
  btn.disabled = true;
  btn.textContent = "Реєстрація…";

  try {
    await apiRegister(name, email, password);
    showNotice("✅ Реєстрація успішна! Тепер увійдіть.", "success");
    // switch to login tab
    switchTab("login");
    document.getElementById("loginEmail").value = email;
    document.getElementById("loginPassword").focus();
  } catch (err) {
    if (err.status === 409) {
      showNotice("⚠ Користувач із таким email вже існує", "error");
    } else {
      showNotice(`⚠ Помилка реєстрації (${err.status}): ${err.message}`, "error");
    }
  } finally {
    btn.disabled = false;
    btn.textContent = "Зареєструватись";
  }
}

// ── Вихід ─────────────────────────────────────────────────────────────────────

async function handleLogout() {
  await apiLogout();
  state.polls = [];
  showAuth();
  showNotice("👋 Ви вийшли з системи", "success");
  // Clear password fields for security
  document.getElementById("loginPassword").value = "";
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

function switchTab(tab) {
  const isLogin = tab === "login";
  document.getElementById("loginPane").style.display    = isLogin ? "" : "none";
  document.getElementById("registerPane").style.display = isLogin ? "none" : "";
  document.getElementById("tabLogin").classList.toggle("active", isLogin);
  document.getElementById("tabRegister").classList.toggle("active", !isLogin);
}

// ── Polls: завантаження ───────────────────────────────────────────────────────

async function loadList() {
  renderListStatus("loading");
  try {
    const items = await getPollList();
    state.polls = items;
    if (!items || items.length === 0) {
      renderPollList([]);
      renderListStatus("empty");
      return;
    }
    applyFilterAndRender();
    renderListStatus("success");
  } catch (err) {
    renderPollList([]);
    renderListStatus("error", err);
  }
}

function applyFilterAndRender() {
  const search = getSearchValue();
  const sort   = getSortValue();
  let filtered = [...state.polls];
  if (search) filtered = filtered.filter((p) => p.title?.toLowerCase().includes(search));
  if (sort === "dateAsc")  filtered.sort((a, b) => new Date(a.endDate) - new Date(b.endDate));
  if (sort === "dateDesc") filtered.sort((a, b) => new Date(b.endDate) - new Date(a.endDate));
  renderPollList(filtered);
  if (filtered.length === 0 && state.polls.length > 0) renderListStatus("empty");
  else if (state.polls.length > 0) renderListStatus("success");
}

// ── Polls: деталі ─────────────────────────────────────────────────────────────

async function showDetail(id) {
  openDetailModal();
  renderDetailStatus("loading");
  document.getElementById("detailContent").innerHTML = "";
  try {
    const poll = await getPollById(id);
    renderDetailStatus("success");
    renderPollDetail(poll);
  } catch (err) {
    renderDetailStatus("error", err);
  }
}

// ── Polls: форма ──────────────────────────────────────────────────────────────

function validateForm(dto) {
  clearFormErrors();
  let valid = true;
  if (dto.title.length < 3) {
    showFieldError("titleInput", "titleError", "Назва: мінімум 3 символи."); valid = false;
  } else if (dto.title.length > 50) {
    showFieldError("titleInput", "titleError", "Назва: максимум 50 символів."); valid = false;
  }
  if (dto.author.length < 2) {
    showFieldError("authorInput", "authorError", "Автор: мінімум 2 символи."); valid = false;
  }
  if (!dto.endDate) {
    showFieldError("endDateInput", "endDateError", "Оберіть дату завершення."); valid = false;
  }
  if (!dto.visibility) {
    showFieldError("visibilitySelect", "visibilityError", "Оберіть видимість."); valid = false;
  }
  if (dto.description.length > 200) {
    showFieldError("descInput", "descError", "Опис: максимум 200 символів."); valid = false;
  }
  return valid;
}

async function handleFormSubmit(event) {
  event.preventDefault();
  const dto = readForm();
  if (!validateForm(dto)) return;
  setFormEnabled(false);
  try {
    if (dto.id) {
      await updatePoll(dto.id, { title: dto.title, author: dto.author, endDate: dto.endDate, visibility: dto.visibility, description: dto.description });
      showNotice("✅ Опитування оновлено", "success");
    } else {
      await createPoll({ title: dto.title, author: dto.author, endDate: dto.endDate, visibility: dto.visibility, description: dto.description });
      showNotice("✅ Опитування створено", "success");
    }
    resetForm();
    await loadList();
  } catch (err) {
    const prefix = err.status === 400 ? "⚠ Валідація (400)" : err.status === 409 ? "⚠ Конфлікт (409)" : `⚠ Помилка (${err.status})`;
    showNotice(`${prefix}: ${err.message}`, "error");
  } finally {
    setFormEnabled(true);
  }
}

async function handleDelete(id) {
  if (!confirm("Видалити це опитування? Дію не можна скасувати.")) return;
  try {
    await deletePoll(id);
    showNotice("🗑 Опитування видалено", "success");
    await loadList();
  } catch (err) {
    showNotice(`⚠ Помилка видалення (${err.status}): ${err.message}`, "error");
  }
}

// ── Bind events ───────────────────────────────────────────────────────────────

function bindEvents() {
  // Auth
  document.getElementById("loginBtn")?.addEventListener("click", handleLogin);
  document.getElementById("registerBtn")?.addEventListener("click", handleRegister);
  document.getElementById("logoutBtn")?.addEventListener("click", handleLogout);

  // Enter key in login form
  document.getElementById("loginPassword")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleLogin();
  });
  document.getElementById("loginEmail")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") document.getElementById("loginPassword").focus();
  });

  // Auth tabs
  document.getElementById("tabLogin")?.addEventListener("click",    () => switchTab("login"));
  document.getElementById("tabRegister")?.addEventListener("click", () => switchTab("register"));

  // Password visibility toggles
  document.querySelectorAll(".pw-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const inp = document.getElementById(btn.dataset.target);
      if (!inp) return;
      inp.type   = inp.type === "password" ? "text" : "password";
      btn.textContent = inp.type === "password" ? "👁" : "🙈";
    });
  });

  // Polls form
  document.getElementById("pollForm")?.addEventListener("submit", handleFormSubmit);
  document.getElementById("resetBtn")?.addEventListener("click", resetForm);

  // Search & sort
  document.getElementById("searchInput")?.addEventListener("input", applyFilterAndRender);
  document.getElementById("sortSelect")?.addEventListener("change", applyFilterAndRender);

  // Table delegation
  document.getElementById("pollsTableBody")?.addEventListener("click", async (e) => {
    const target = e.target;
    if (target.classList.contains("delete-btn")) {
      await handleDelete(Number(target.dataset.id));
    }
    if (target.classList.contains("edit-btn")) {
      const poll = state.polls.find((p) => p.id === Number(target.dataset.id));
      if (poll) { fillFormForEdit(poll); window.scrollTo({ top: 0, behavior: "smooth" }); }
    }
    if (target.classList.contains("detail-btn")) {
      await showDetail(Number(target.dataset.id));
    }
  });

  document.getElementById("pollsTable")?.addEventListener("dblclick", async (e) => {
    const row = e.target.closest("tr[data-id]");
    if (row) await showDetail(Number(row.dataset.id));
  });

  // Modal close
  document.getElementById("closeDetailBtn")?.addEventListener("click", closeDetailModal);
  document.getElementById("detailModal")?.addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeDetailModal();
  });
}

// ── Init ──────────────────────────────────────────────────────────────────────

async function init() {
  bindEvents();

  if (isLoggedIn()) {
    // Restore session from sessionStorage
    showApp();
    await loadList();
  } else {
    showAuth();
  }
}

init();
