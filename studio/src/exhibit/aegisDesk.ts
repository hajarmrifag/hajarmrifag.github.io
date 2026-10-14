/**
 * Simulated claims stamp for one fictional record.
 * Rules follow ClaimsController and ClaimService:
 * only Manager and Admin may change status, an unrecognized role is not
 * granted that endpoint, an unchanged status writes no history row, and a
 * real change records previous status, new status, and the time.
 * This desk does not call the API.
 */

type Role = "Adjuster" | "Manager" | "Admin";
type Status = "Submitted" | "UnderReview" | "Approved" | "Rejected" | "Paid";

interface HistoryRow {
  previous: Status;
  next: Status;
  changedAt: string;
}

const ROLES: Role[] = ["Adjuster", "Manager", "Admin"];
const STATUSES: Status[] = ["Submitted", "UnderReview", "Approved", "Rejected", "Paid"];

const LABEL: Record<Status, string> = {
  Submitted: "Submitted",
  UnderReview: "Under review",
  Approved: "Approved",
  Rejected: "Rejected",
  Paid: "Paid",
};

function isRole(value: string): value is Role {
  return ROLES.some((role) => role === value);
}

function isStatus(value: string): value is Status {
  return STATUSES.some((status) => status === value);
}

function clock(date: Date): string {
  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    timeZone: "UTC",
  }).format(date);
  return `${time} UTC`;
}

/** Desk readout for the Aegis station. Hidden until that station is approached. */
export function mountAegisDesk(root: HTMLElement): void {
  const panel = root.querySelector<HTMLElement>("[data-aegis-desk]");
  if (!panel) return;

  const roles = [...panel.querySelectorAll<HTMLInputElement>('input[name="aegis-role"]')];
  const statuses = [...panel.querySelectorAll<HTMLInputElement>('input[name="aegis-status"]')];
  const stamp = panel.querySelector<HTMLButtonElement>("[data-stamp]");
  const statusNode = panel.querySelector<HTMLElement>("[data-claim-status]");
  const seal = panel.querySelector<HTMLElement>("[data-seal]");
  const audit = panel.querySelector<HTMLElement>("[data-audit]");
  const result = panel.querySelector<HTMLElement>("[data-stamp-result]");
  if (!stamp || !statusNode || !seal || !audit || !result || roles.length !== 3 || statuses.length !== 5) return;

  let current: Status = "Submitted";
  const history: HistoryRow[] = [];

  const selectedRole = (): Role => {
    const value = roles.find((role) => role.checked)?.value ?? "Adjuster";
    return isRole(value) ? value : "Adjuster";
  };
  const selectedStatus = (): Status => {
    const value = statuses.find((status) => status.checked)?.value ?? "UnderReview";
    return isStatus(value) ? value : "UnderReview";
  };

  const paint = () => {
    statusNode.textContent = LABEL[current];
    if (history.length === 0) {
      seal.dataset.empty = "true";
      seal.textContent = "No seal";
      audit.replaceChildren();
      const empty = document.createElement("li");
      empty.textContent = "No status change has been recorded.";
      audit.append(empty);
      return;
    }
    const latest = history[history.length - 1];
    seal.dataset.empty = "false";
    seal.textContent = latest ? LABEL[latest.next] : "No seal";
    audit.replaceChildren();
    for (const row of history) {
      const item = document.createElement("li");
      item.textContent = `${row.previous} → ${row.next} · ${row.changedAt}`;
      audit.append(item);
    }
  };

  const press = () => {
    const role = selectedRole();
    const requested = selectedStatus();
    panel.classList.add("is-pressing");
    window.setTimeout(() => panel.classList.remove("is-pressing"), 180);

    if (role === "Adjuster") {
      result.textContent = `403 Forbidden. An Adjuster cannot change claim status. The record stays ${LABEL[current]}. No history row was written.`;
      paint();
      return;
    }

    if (requested === current) {
      result.textContent = `200 OK. The status was already ${requested}, so the API left it unchanged and wrote no history row.`;
      paint();
      return;
    }

    const previous = current;
    current = requested;
    history.push({ previous, next: requested, changedAt: clock(new Date()) });
    result.textContent = `200 OK. ${role} may set the status. The record is now ${LABEL[current]}. History: ${previous} → ${requested}.`;
    paint();
  };

  stamp.addEventListener("click", press);
  paint();
  result.textContent = "Choose a role and a status, then stamp the folder. This desk does not call the API.";

  const place = () => {
    const lede = document.querySelector(".lede");
    const dock = document.querySelector(".work");
    if (!lede || !dock) return;
    const top = lede.getBoundingClientRect().bottom + 8;
    const dockTop = dock.getBoundingClientRect().top;
    const gap = window.innerWidth < 900 ? 18 : 14;
    panel.style.top = `${top}px`;
    panel.style.maxHeight = `${Math.max(180, dockTop - top - gap)}px`;
  };

  let live = false;
  const sync = () => {
    const approach = Number(root.dataset.approach ?? "0");
    const next = root.dataset.selected === "aegis" && approach >= 0.82;
    if (next === live) return;
    live = next;
    panel.classList.toggle("is-live", next);
    panel.inert = !next;
    panel.setAttribute("aria-hidden", next ? "false" : "true");
    if (next) place();
  };

  const frame = new ResizeObserver(place);
  frame.observe(document.documentElement);
  for (const node of [document.querySelector(".mast"), document.querySelector(".lede"), document.querySelector(".work")]) {
    if (node) frame.observe(node);
  }
  place();
  sync();
  new MutationObserver(sync).observe(root, {
    attributes: true,
    attributeFilter: ["data-approach", "data-selected"],
  });
}
