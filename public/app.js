let polls = [];

const form = document.getElementById("pollForm");
const tbody = document.getElementById("pollsTableBody");
const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");

function showError(inputId, errorId, message) {
  document.getElementById(inputId).classList.add("invalid");
  document.getElementById(errorId).innerHTML = message;
}

function clearErrors() {
  const inputs = ["titleInput", "authorInput", "endDateInput", "visibilitySelect", "descInput"];
  const errors = ["titleError", "authorError", "endDateError", "visibilityError", "descError"];

  inputs.forEach((id) => document.getElementById(id).classList.remove("invalid"));
  errors.forEach((id) => (document.getElementById(id).innerHTML = ""));
}

function readForm() {
  return {
    id: document.getElementById("editId").value,
    title: document.getElementById("titleInput").value.trim(),
    author: document.getElementById("authorInput").value.trim(),
    endDate: document.getElementById("endDateInput").value,
    visibility: document.getElementById("visibilitySelect").value,
    description: document.getElementById("descInput").value.trim(),
  };
}

function validate(dto) {
  clearErrors();
  let isValid = true;

  if (dto.title.length < 3) {
    showError("titleInput", "titleError", "Назва має містити мінімум 3 символи.");
    isValid = false;
  }

  if (dto.author.length < 2) {
    showError("authorInput", "authorError", "Вкажіть коректного автора.");
    isValid = false;
  }

  if (dto.endDate === "") {
    showError("endDateInput", "endDateError", "Оберіть дату завершення.");
    isValid = false;
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(dto.endDate)) {
    showError(
      "endDateInput",
      "endDateError",
      "Рік має бути чотиризначним, формат дати: рррр-мм-дд.",
    );
    isValid = false;
  }

  if (dto.visibility === "") {
    showError("visibilitySelect", "visibilityError", "Оберіть видимість.");
    isValid = false;
  }

  if (dto.description.length > 200) {
    showError("descInput", "descError", "Опис не може перевищувати 200 символів.");
    isValid = false;
  }

  return isValid;
}

function getProcessedItems() {
  let processed = [...polls];
  const searchTerm = searchInput.value.toLowerCase().trim();

  if (searchTerm) {
    processed = processed.filter((p) => p.title.toLowerCase().includes(searchTerm));
  }

  const sortVal = sortSelect.value;
  if (sortVal === "dateAsc") {
    processed.sort((a, b) => new Date(a.endDate) - new Date(b.endDate));
  } else if (sortVal === "dateDesc") {
    processed.sort((a, b) => new Date(b.endDate) - new Date(a.endDate));
  }

  return processed;
}

function renderTable() {
  const itemsToRender = getProcessedItems();

  if (itemsToRender.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Записів не знайдено</td></tr>`;
    return;
  }

  tbody.innerHTML = itemsToRender
    .map(
      (poll) => `
        <tr>
            <td><strong>${poll.title}</strong><br><small>${poll.description || ""}</small></td>
            <td>${poll.author}</td>
            <td>${poll.endDate}</td>
            <td>${poll.visibility === "Public" ? "Публічне" : "Приватне"}</td>
            <td>
                <button type="button" class="edit-btn" data-id="${poll.id}">Редагувати</button>
                <button type="button" class="delete-btn" data-id="${poll.id}">Видалити</button>
            </td>
        </tr>
    `,
    )
    .join("");
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const dto = readForm();
  if (!validate(dto)) return;

  if (dto.id) {
    await saveAndRender("PUT", dto);
  } else {
    const createDto = {
      title: dto.title,
      author: dto.author,
      endDate: dto.endDate,
      visibility: dto.visibility,
      description: dto.description,
    };
    await saveAndRender("POST", createDto);
  }

  resetFormState();
});

document.getElementById("resetBtn").addEventListener("click", resetFormState);
searchInput.addEventListener("input", renderTable);
sortSelect.addEventListener("change", renderTable);

tbody.addEventListener("click", async (event) => {
  const target = event.target;

  if (target.classList.contains("delete-btn")) {
    const id = Number(target.dataset.id);
    if (confirm("Ви впевнені?")) {
      await saveAndRender("DELETE", { id });
    }
  }

  if (target.classList.contains("edit-btn")) {
    const id = Number(target.dataset.id);
    const pollToEdit = polls.find((p) => p.id === id);
    if (pollToEdit) {
      document.getElementById("editId").value = pollToEdit.id;
      document.getElementById("titleInput").value = pollToEdit.title;
      document.getElementById("authorInput").value = pollToEdit.author;
      document.getElementById("endDateInput").value = pollToEdit.endDate;
      document.getElementById("visibilitySelect").value = pollToEdit.visibility;
      document.getElementById("descInput").value = pollToEdit.description || "";

      document.getElementById("formTitle").innerText = "Редагування опитування";
      document.getElementById("submitBtn").innerText = "Зберегти";
      clearErrors();
    }
  }
});

function resetFormState() {
  form.reset();
  document.getElementById("editId").value = "";
  document.getElementById("formTitle").innerText = "Додати опитування";
  document.getElementById("submitBtn").innerText = "Додати";
  clearErrors();
}

async function saveAndRender(method = "POST", data = null) {
  try {
    const url = data && data.id ? `/api/polls/${data.id}` : "/api/polls";

    const options = { method };
    if (method !== "DELETE") {
      options.headers = { "Content-Type": "application/json" };
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);

    if (response.ok) {
      await loadPolls();
      return;
    }

    const errorData = await response.json();
    const details = errorData.error?.details
      ? "\n" + errorData.error.details.map((item) => `${item.field}: ${item.message}`).join("\n")
      : "";
    alert("Помилка сервера: " + (errorData.error?.message || "Невідома помилка") + details);
  } catch (err) {
    console.error("Сервер недоступний", err);
    alert("Помилка зв'язку з сервером. Перевірте, чи запущений backend.");
  }
}

async function loadPolls() {
  const response = await fetch("/api/polls");

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || "Не вдалося завантажити опитування");
  }

  const data = await response.json();

  // Backend повертає { data: [...], meta: { total, page, pageSize } }
  // Сумісність зі старим форматом data.items збережена як fallback
  polls = Array.isArray(data) ? data : (data.data || data.items || []);

  renderTable();
}

async function init() {
  try {
    await loadPolls();
  } catch (err) {
    console.error("Не вдалося завантажити дані з сервера", err);
  }
}

init();
