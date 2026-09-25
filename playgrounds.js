import {
  createClaim,
  updateClaim,
  createBank,
  transfer,
  compareGemm,
} from "./playground-models.js";
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const workbench = $("[data-workbench]");
const slot = $(".workbench-slot");
const modal = $(".lab-dialog");
const tabs = $$("[data-lab]");
let currentLab = "claims";
let returnFocus;

function selectLab(name, focus = false) {
  if (!tabs.some((tab) => tab.dataset.lab === name)) return;
  currentLab = name;
  for (const tab of tabs) {
    const selected = tab.dataset.lab === name;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
    $(`#panel-${tab.dataset.lab}`).hidden = !selected;
    if (selected && focus) tab.focus();
  }
  $("[data-lab-kind]").textContent =
    name === "cuda"
      ? "RECORDED MEASUREMENTS · NOT A LIVE BENCHMARK"
      : name === "gridflex"
        ? "GUIDED ARCHITECTURE · SOURCE LINKED AT EACH STEP"
        : "LOCAL MODEL · NO ACCOUNT NEEDED";
}
for (const tab of tabs) {
  tab.addEventListener("click", () => selectLab(tab.dataset.lab));
  tab.addEventListener("keydown", (event) => {
    const index = tabs.indexOf(tab);
    let next;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    if (event.key === "ArrowLeft")
      next = (index - 1 + tabs.length) % tabs.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = tabs.length - 1;
    if (next !== undefined) {
      event.preventDefault();
      selectLab(tabs[next].dataset.lab, true);
    }
  });
}
function openLab(name, trigger) {
  returnFocus = trigger || document.activeElement;
  selectLab(name);
  $("[data-lab-mount]").append(workbench);
  modal.showModal();
  $("[data-close-lab]").focus();
}
$$("[data-open-lab]").forEach((button) =>
  button.addEventListener("click", () =>
    openLab(button.dataset.openLab, button),
  ),
);
$("[data-expand-lab]").addEventListener("click", (event) =>
  openLab(currentLab, event.currentTarget),
);
$("[data-close-lab]").addEventListener("click", () => modal.close());
modal.addEventListener("close", () => {
  slot.prepend(workbench);
  returnFocus?.focus({ preventScroll: true });
});
modal.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    event.preventDefault();
    modal.close();
  }
});
modal.addEventListener("click", (event) => {
  if (event.target !== modal) return;
  const bounds = modal.getBoundingClientRect();
  if (
    event.clientX < bounds.left ||
    event.clientX > bounds.right ||
    event.clientY < bounds.top ||
    event.clientY > bounds.bottom
  )
    modal.close();
});
$$("[data-command-lab]").forEach((link) =>
  link.addEventListener("click", (event) => {
    event.preventDefault();
    // Wait for the command dialog's close event before opening a second modal.
    const command = $(".command-dialog");
    if (command.open) command.close();
    requestAnimationFrame(() =>
      openLab(link.dataset.commandLab, $("[data-open-command]")),
    );
  }),
);
$(".workbench-footer a").addEventListener("click", () => {
  if (modal.open) modal.close();
});

function response(target, code, message) {
  const names = {
    200: "200 · OK",
    201: "201 · Committed",
    400: "400 · Invalid request",
    403: "403 · Forbidden",
    409: "409 · Conflict",
    422: "422 · Invalid input",
    503: "503 · Failure injected",
  };
  target.querySelector("strong").textContent = names[code];
  target.querySelector("span").textContent = message;
  target.dataset.outcome = code < 400 ? "success" : "blocked";
}
let claim = createClaim();
function renderClaim() {
  $("[data-claim-status]").textContent = claim.status.replace(
    "UnderReview",
    "Under review",
  );
  $("[data-audit-count]").textContent =
    `${claim.audit.length} ${claim.audit.length === 1 ? "event" : "events"}`;
  const list = $("[data-claim-audit]");
  list.replaceChildren();
  if (!claim.audit.length) {
    const li = document.createElement("li");
    li.textContent = "No status changes yet.";
    list.append(li);
  }
  for (const entry of claim.audit.slice(-6).reverse()) {
    const li = document.createElement("li");
    li.textContent = `${entry.from} → ${entry.to} · ${entry.role}`;
    list.append(li);
  }
}
$("[data-claim-apply]").addEventListener("click", () => {
  const result = updateClaim(
    claim,
    $("#claim-role").value,
    $("#claim-next").value,
  );
  claim = result.state;
  renderClaim();
  response($("[data-claim-response]"), result.code, result.message);
});
$("[data-claim-reset]").addEventListener("click", () => {
  claim = createClaim();
  renderClaim();
  $("#claim-role").value = "Adjuster";
  $("#claim-next").value = "Approved";
  const output = $("[data-claim-response]");
  delete output.dataset.outcome;
  output.querySelector("strong").textContent = "Ready to test the boundary.";
  output.querySelector("span").textContent =
    "The API checks the role before changing the claim.";
});

const number = new Intl.NumberFormat("en-GB", {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});
$("#matrix-size").addEventListener("change", (event) => {
  const result = compareGemm(event.target.value);
  result.values.forEach((value, index) => {
    $(`[data-gpu-value="${index}"]`).textContent = number.format(value);
    $(`[data-gpu-bar="${index}"]`).style.width =
      `${(value / result.values[3]) * 100}%`;
  });
  $("[data-gpu-speedup]").textContent = `${result.speedup.toFixed(2)}×`;
  $("[data-gpu-ratio]").textContent = `${result.libraryPercent.toFixed(1)}%`;
});

let bank = createBank(),
  requestCount = 0,
  lastRequest = null;
const money = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
});
function renderBank() {
  $("[data-bank-source]").textContent = money.format(bank.source / 100);
  $("[data-bank-destination]").textContent = money.format(
    bank.destination / 100,
  );
  $("[data-bank-count]").textContent = bank.transfers.length;
  $('[data-bank-action="retry"]').disabled = !lastRequest;
}
$$("[data-bank-action]").forEach((button) =>
  button.addEventListener("click", () => {
    const action = button.dataset.bankAction;
    const request =
      action === "retry"
        ? lastRequest
        : {
            key: `demo-${++requestCount}`,
            amountMinor: action === "overdraw" ? 500000 : 10000,
            failBeforeCommit: action === "fail",
          };
    if (!request) return;
    const result = transfer(bank, request);
    if (result.code === 201) lastRequest = request;
    bank = result.state;
    renderBank();
    response($("[data-bank-response]"), result.code, result.message);
  }),
);
$("[data-bank-reset]").addEventListener("click", () => {
  bank = createBank();
  lastRequest = null;
  requestCount = 0;
  renderBank();
  const output = $("[data-bank-response]");
  delete output.dataset.outcome;
  output.querySelector("strong").textContent =
    "£1,250.00 conserved across both accounts.";
  output.querySelector("span").textContent =
    "Choose a scenario to inspect its effect.";
});

const architecture = [
  {
    file: "frontend/src/api.ts",
    title: "Keep the interface honest.",
    copy: "Controls remain drafts until applied. Request cancellation and an active-result guard prevent an older request from replacing the latest scenario.",
    code: "Draft settings → Apply\nPOST /api/simulate\nAbortSignal + active-result guard",
    tradeoff:
      "Aborting a browser request does not terminate server computation already running.",
  },
  {
    file: "api/models.py",
    title: "Validate before doing the work.",
    copy: "The API accepts named public profiles and bounded horizons. Unknown fields, infinities and NaN are rejected at the request boundary.",
    code: 'days: 7 | 14 | 30 | 60\nextra = "forbid"\nallow_inf_nan = False',
    tradeoff:
      "The browser cannot choose a file path or ask the server to evaluate arbitrary expressions.",
  },
  {
    file: "api/service.py",
    title: "Separate orchestration from physics.",
    copy: "The service sizes the battery and loads profiles. Pure numerical routines conserve energy and respect power, capacity and efficiency constraints.",
    code: "Validated scenario → bounded cache\nDemand shift → battery dispatch\nSeries → traceable metrics",
    tradeoff:
      "Two compute slots and bounded caches protect a single-process research service; this is not a distributed job system.",
  },
  {
    file: "frontend/src/views/Overview.tsx",
    title: "Make the result inspectable.",
    copy: "The API returns metrics and hourly dispatch series. The workspace renders the observations, while scenario links and exports make the experiment portable.",
    code: "Versioned result + scenario identifier\nHourly SVG charts + dispatch replay\nExport / compare / save locally",
    tradeoff:
      "Up to six saved scenarios stay in this browser. They are not cross-device accounts.",
  },
];
let layer = 0;
function showLayer(index) {
  layer = index;
  const entry = architecture[layer];
  $$("[data-architecture]").forEach((button) =>
    button.setAttribute(
      "aria-pressed",
      String(Number(button.dataset.architecture) === layer),
    ),
  );
  $("[data-architecture-file]").textContent = entry.file;
  $("[data-architecture-title]").textContent = entry.title;
  $("[data-architecture-copy]").textContent = entry.copy;
  $("[data-architecture-code] code").textContent = entry.code;
  $("[data-architecture-tradeoff]").textContent = entry.tradeoff;
  $("[data-architecture-source]").href =
    `https://github.com/hajarmrifag/gridflex-ai/blob/main/${entry.file}`;
  $("[data-architecture-next]").textContent = [
    "Next: the API contract →",
    "Next: the engine →",
    "Next: the result →",
    "Start the path again ↺",
  ][layer];
}
$$("[data-architecture]").forEach((button) =>
  button.addEventListener("click", () =>
    showLayer(Number(button.dataset.architecture)),
  ),
);
$("[data-architecture-next]").addEventListener("click", () =>
  showLayer((layer + 1) % architecture.length),
);
document.documentElement.classList.add("lab-ready");
