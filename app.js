const STORAGE_KEY = "genzClubSIH26043_v1";
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

let activeFilter = "All";
let toastTimer;

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.challenges) && Array.isArray(saved.solutions) && Array.isArray(saved.supports)) return saved;
  } catch (error) {
    console.warn("Could not read saved demo data.", error);
  }
  return { challenges: [], solutions: [], supports: [] };
}

let data = loadData();

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  renderAll();
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[char]));
}

function makeId(prefix) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function dateLabel(value) {
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function statusClass(status) {
  return status.toLowerCase().replace(/\s+/g, "-");
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function showView(viewName) {
  $$(".view").forEach((view) => view.classList.toggle("active", view.id === `view-${viewName}`));
  $$(".nav-link").forEach((button) => button.classList.toggle("active", button.dataset.view === viewName));
  const activeButton = $(`.nav-link[data-view="${viewName}"]`);
  $("#breadcrumb-current").textContent = activeButton ? activeButton.textContent.trim() : "Overview";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

$$(".nav-link").forEach((button) => button.addEventListener("click", () => showView(button.dataset.view)));
$$("[data-go]").forEach((button) => button.addEventListener("click", () => showView(button.dataset.go)));

function challengeCard(challenge, withActions = false) {
  const actions = withActions ? `
    <div class="record-actions">
      ${challenge.status === "Pending" ? `<button class="small-action success" data-action="verify" data-id="${escapeHTML(challenge.id)}">Mark verified</button>` : ""}
      ${challenge.status === "Verified" ? `<button class="small-action" data-action="progress" data-id="${escapeHTML(challenge.id)}">Move to in progress</button>` : ""}
    </div>` : "";
  return `<article class="record-card">
    <div class="record-top"><div><h3>${escapeHTML(challenge.title)}</h3><div class="record-meta"><span>◎ ${escapeHTML(challenge.category)}</span><span>⌖ ${escapeHTML(challenge.location)}</span><span>By ${escapeHTML(challenge.name)}</span></div></div><span class="status status-${statusClass(challenge.status)}">${escapeHTML(challenge.status)}</span></div>
    <p class="record-description">${escapeHTML(challenge.description)}</p>
    <div class="record-footer"><span class="record-id">${escapeHTML(challenge.id)} · ${dateLabel(challenge.createdAt)}</span>${actions}</div>
  </article>`;
}

function solutionCard(solution, withSupportAction = false) {
  const challenge = data.challenges.find((item) => item.id === solution.challengeId);
  const alreadySupported = data.supports.some((support) => support.solutionId === solution.id);
  return `<article class="record-card">
    <div class="record-top"><div><h3>${escapeHTML(solution.title)}</h3><div class="record-meta"><span>⌂ ${escapeHTML(solution.university)}</span><span>Challenge: ${escapeHTML(challenge ? challenge.title : "Unavailable")}</span></div></div><span class="status ${alreadySupported ? "status-supported" : "status-verified"}">${alreadySupported ? "Support registered" : "Open for support"}</span></div>
    <p class="record-description">${escapeHTML(solution.description)}</p>
    <div class="record-footer"><span class="record-id">${escapeHTML(solution.id)} · ${dateLabel(solution.createdAt)}</span>${withSupportAction ? `<button class="small-action" data-select-solution="${escapeHTML(solution.id)}">Select for support</button>` : ""}</div>
  </article>`;
}

function renderOverview() {
  $("#stat-total").textContent = data.challenges.length;
  $("#stat-review").textContent = data.challenges.filter((item) => item.status === "Pending").length;
  $("#stat-solutions").textContent = data.solutions.length;
  $("#stat-supported").textContent = data.supports.length;

  const recent = [...data.challenges].reverse().slice(0, 3);
  $("#recent-challenges").innerHTML = recent.length ? recent.map((item) => challengeCard(item)).join("") :
    `<div class="empty-state compact"><span class="empty-symbol">◎</span><strong>No challenges yet</strong><p>Submit the first community challenge to see it here.</p></div>`;
}

function renderVerification() {
  const filtered = activeFilter === "All" ? data.challenges : data.challenges.filter((item) => item.status === activeFilter);
  $("#verification-count").textContent = `${filtered.length} report${filtered.length === 1 ? "" : "s"}`;
  $("#verification-list").innerHTML = filtered.length ? [...filtered].reverse().map((item) => challengeCard(item, true)).join("") :
    `<div class="panel empty-state"><span class="empty-symbol">✓</span><strong>No reports in this view</strong><p>New citizen submissions will appear here.</p></div>`;
}

function renderUniversity() {
  const verified = data.challenges.filter((item) => item.status === "Verified" || item.status === "In Progress");
  $("#university-challenges").innerHTML = verified.length ? [...verified].reverse().map((item) => challengeCard(item)).join("") :
    `<div class="panel empty-state"><span class="empty-symbol">⌂</span><strong>No verified challenges available</strong><p>Verify a report in the Verification Desk to make it available here.</p></div>`;

  const select = $("#solution-challenge");
  const previous = select.value;
  select.innerHTML = `<option value="">Select a verified challenge</option>` + verified.map((item) =>
    `<option value="${escapeHTML(item.id)}">${escapeHTML(item.title)} — ${escapeHTML(item.location)}</option>`).join("");
  if (verified.some((item) => item.id === previous)) select.value = previous;

  $("#solution-list").innerHTML = data.solutions.length ? [...data.solutions].reverse().map((item) => solutionCard(item)).join("") :
    `<div class="panel empty-state"><span class="empty-symbol">✧</span><strong>No proposals yet</strong><p>University solution proposals will appear here.</p></div>`;
}

function renderIndustry() {
  $("#industry-solutions").innerHTML = data.solutions.length ? [...data.solutions].reverse().map((item) => solutionCard(item, true)).join("") :
    `<div class="panel empty-state"><span class="empty-symbol">◇</span><strong>No solutions to review yet</strong><p>Submit a university proposal first.</p></div>`;

  const select = $("#support-solution");
  const previous = select.value;
  select.innerHTML = `<option value="">Select a solution</option>` + data.solutions.map((item) =>
    `<option value="${escapeHTML(item.id)}">${escapeHTML(item.title)} — ${escapeHTML(item.university)}</option>`).join("");
  if (data.solutions.some((item) => item.id === previous)) select.value = previous;

  $("#support-list").innerHTML = data.supports.length ? [...data.supports].reverse().map((support) => {
    const solution = data.solutions.find((item) => item.id === support.solutionId);
    return `<article class="record-card"><div class="record-top"><div><h3>${escapeHTML(support.company)}</h3><div class="record-meta"><span>Support type: ${escapeHTML(support.type)}</span><span>For: ${escapeHTML(solution ? solution.title : "Unavailable solution")}</span></div></div><span class="status status-supported">Interest registered</span></div><p class="record-description">${escapeHTML(support.note || "No additional details provided.")}</p><div class="record-footer"><span class="record-id">${escapeHTML(support.id)} · ${dateLabel(support.createdAt)}</span></div></article>`;
  }).join("") : `<div class="panel empty-state"><span class="empty-symbol">◇</span><strong>No support activity yet</strong><p>Industry expressions of interest will appear here.</p></div>`;
}

function renderBars(container, rows) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  container.innerHTML = rows.length ? rows.map((row) => `<div class="bar-row"><span>${escapeHTML(row.label)}</span><div class="bar-track"><div class="bar-fill" style="width:${Math.round((row.value / max) * 100)}%"></div></div><b class="bar-value">${row.value}</b></div>`).join("") :
    `<div class="empty-state compact"><strong>No data yet</strong><p>Activity will appear after submissions.</p></div>`;
}

function renderGovernment() {
  $("#gov-total").textContent = data.challenges.length;
  $("#gov-verified").textContent = data.challenges.filter((item) => item.status === "Verified" || item.status === "In Progress").length;
  $("#gov-solutions").textContent = data.solutions.length;
  $("#gov-support").textContent = data.supports.length;

  const statuses = ["Pending", "Verified", "In Progress"];
  renderBars($("#status-breakdown"), statuses.map((status) => ({ label: status, value: data.challenges.filter((item) => item.status === status).length })));

  const categories = [...new Set(data.challenges.map((item) => item.category))];
  renderBars($("#category-breakdown"), categories.map((category) => ({ label: category, value: data.challenges.filter((item) => item.category === category).length })));

  $("#government-table").innerHTML = data.challenges.length ? [...data.challenges].reverse().map((item) => `<tr><td>${escapeHTML(item.title)}</td><td>${escapeHTML(item.category)}</td><td>${escapeHTML(item.location)}</td><td><span class="status status-${statusClass(item.status)}">${escapeHTML(item.status)}</span></td><td>${dateLabel(item.createdAt)}</td></tr>`).join("") :
    `<tr><td colspan="5">No community challenges have been submitted yet.</td></tr>`;
}

function renderAll() {
  renderOverview();
  renderVerification();
  renderUniversity();
  renderIndustry();
  renderGovernment();
}

$("#challenge-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const challenge = {
    id: makeId("GZC"), name: form.get("name").trim(), title: form.get("title").trim(),
    category: form.get("category"), location: form.get("location").trim(),
    description: form.get("description").trim(), status: "Pending", createdAt: new Date().toISOString()
  };
  data.challenges.push(challenge);
  saveData();
  event.currentTarget.reset();
  $("#challenge-message").textContent = `Submitted successfully. Your challenge ID is ${challenge.id}.`;
  showToast("Community challenge submitted.");
});

$("#solution-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const solution = {
    id: makeId("SOL"), challengeId: form.get("challengeId"), university: form.get("university").trim(),
    title: form.get("title").trim(), description: form.get("description").trim(), createdAt: new Date().toISOString()
  };
  if (!data.challenges.some((item) => item.id === solution.challengeId && ["Verified", "In Progress"].includes(item.status))) {
    $("#solution-message").textContent = "Please select a currently verified challenge.";
    return;
  }
  data.solutions.push(solution);
  saveData();
  event.currentTarget.reset();
  $("#solution-message").textContent = "Solution proposal submitted successfully.";
  showToast("University proposal submitted.");
});

$("#support-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const support = {
    id: makeId("SUP"), solutionId: form.get("solutionId"), company: form.get("company").trim(),
    type: form.get("type"), note: form.get("note").trim(), createdAt: new Date().toISOString()
  };
  if (!data.solutions.some((item) => item.id === support.solutionId)) {
    $("#support-message").textContent = "Please select an available solution.";
    return;
  }
  data.supports.push(support);
  saveData();
  event.currentTarget.reset();
  $("#support-message").textContent = "Support interest registered successfully.";
  showToast("Industry support registered.");
});

$("#verification-list").addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const challenge = data.challenges.find((item) => item.id === button.dataset.id);
  if (!challenge) return;
  if (button.dataset.action === "verify" && challenge.status === "Pending") challenge.status = "Verified";
  if (button.dataset.action === "progress" && challenge.status === "Verified") challenge.status = "In Progress";
  saveData();
  showToast("Challenge status updated.");
});

$("#industry-solutions").addEventListener("click", (event) => {
  const button = event.target.closest("[data-select-solution]");
  if (!button) return;
  $("#support-solution").value = button.dataset.selectSolution;
  $("#support-solution").scrollIntoView({ behavior: "smooth", block: "center" });
  $("#company-name").focus();
});

$$(".filter-button").forEach((button) => button.addEventListener("click", () => {
  activeFilter = button.dataset.filter;
  $$(".filter-button").forEach((item) => item.classList.toggle("active", item === button));
  renderVerification();
}));

$("#reset-demo").addEventListener("click", () => {
  const confirmed = window.confirm("Clear all GENZ CLUB demo challenges, proposals, and support entries from this browser?");
  if (!confirmed) return;
  data = { challenges: [], solutions: [], supports: [] };
  localStorage.removeItem(STORAGE_KEY);
  renderAll();
  showToast("Demo data has been reset.");
});

renderAll();
