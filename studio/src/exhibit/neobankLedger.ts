/**
 * Simulated passbook for two fictional GBP accounts.
 * Rules follow BankingService.transfer and the POST /transfers route:
 * one commit updates both balances and inserts the transfer,
 * the same idempotency key and payload replay HTTP 200,
 * a different payload for that key is HTTP 409 idempotency_conflict,
 * and insufficient funds is HTTP 409 without storing the key.
 * This desk does not call the API.
 */

const OPEN_ALICE = 10000;
const OPEN_BOB = 0;
const AMOUNTS = [2500, 15000] as const;

type Amount = (typeof AMOUNTS)[number];

interface StoredTransfer {
  id: string;
  amountMinor: number;
  createdAt: string;
}

interface Replay {
  kind: "replay";
  status: 200;
  transfer: StoredTransfer;
}

interface Created {
  kind: "created";
  status: 201;
  transfer: StoredTransfer;
}

interface Rejected {
  kind: "rejected";
  status: 409;
  code: "insufficient_funds" | "idempotency_conflict";
  message: string;
}

type Outcome = Replay | Created | Rejected;

function isAmount(value: string): value is `${Amount}` {
  return AMOUNTS.some((amount) => String(amount) === value);
}

function pounds(minor: number): string {
  const poundsPart = Math.trunc(minor / 100);
  const pence = String(Math.abs(minor % 100)).padStart(2, "0");
  return `£${poundsPart}.${pence}`;
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

function keyName(serial: number): string {
  return `demo-transfer-${String(serial).padStart(3, "0")}`;
}

/** Desk readout for the Neobank station. Hidden until that station is approached. */
export function mountNeobankLedger(root: HTMLElement): void {
  const panel = root.querySelector<HTMLElement>("[data-neobank-desk]");
  if (!panel) return;

  const alicePounds = panel.querySelector<HTMLElement>("[data-alice-pounds]");
  const aliceMinor = panel.querySelector<HTMLElement>("[data-alice-minor]");
  const bobPounds = panel.querySelector<HTMLElement>("[data-bob-pounds]");
  const bobMinor = panel.querySelector<HTMLElement>("[data-bob-minor]");
  const keyNode = panel.querySelector<HTMLElement>("[data-key]");
  const newKey = panel.querySelector<HTMLButtonElement>("[data-new-key]");
  const post = panel.querySelector<HTMLButtonElement>("[data-post]");
  const reset = panel.querySelector<HTMLButtonElement>("[data-reset]");
  const result = panel.querySelector<HTMLElement>("[data-result]");
  const slip = panel.querySelector<HTMLElement>("[data-slip]");
  const seal = panel.querySelector<HTMLElement>("[data-seal]");
  const slipLine = panel.querySelector<HTMLElement>("[data-slip-line]");
  const amounts = [...panel.querySelectorAll<HTMLInputElement>('input[name="neobank-amount"]')];
  if (!alicePounds || !aliceMinor || !bobPounds || !bobMinor || !keyNode || !newKey || !post || !reset || !result || !slip || !seal || !slipLine) return;
  if (amounts.length !== 2) return;

  let alice = OPEN_ALICE;
  let bob = OPEN_BOB;
  let serial = 1;
  let key = keyName(serial);
  const journal = new Map<string, StoredTransfer>();

  const selectedAmount = (): Amount => {
    const value = amounts.find((input) => input.checked)?.value ?? "2500";
    return isAmount(value) ? Number(value) as Amount : 2500;
  };

  const paintBalances = () => {
    alicePounds.textContent = pounds(alice);
    aliceMinor.textContent = `${alice} pence`;
    bobPounds.textContent = pounds(bob);
    bobMinor.textContent = `${bob} pence`;
    keyNode.textContent = key;
  };

  const paintSlip = (outcome: Outcome | null) => {
    if (!outcome) {
      slip.dataset.outcome = "empty";
      seal.textContent = "No entry";
      slipLine.textContent = "Alice Demo and Bob Demo are fictional. Opening balances are £100.00 and £0.00.";
      return;
    }
    if (outcome.kind === "created") {
      slip.dataset.outcome = "posted";
      seal.textContent = "201 Created";
      slipLine.textContent = `${pounds(outcome.transfer.amountMinor)} posted. Idempotency-Replayed: false. ${outcome.transfer.id} · ${outcome.transfer.createdAt}.`;
      return;
    }
    if (outcome.kind === "replay") {
      slip.dataset.outcome = "replay";
      seal.textContent = "200 Replay";
      slipLine.textContent = `Idempotency-Replayed: true. Original transfer ${outcome.transfer.id} returned. Balances stayed put.`;
      return;
    }
    slip.dataset.outcome = "rejected";
    seal.textContent = "409 Conflict";
    slipLine.textContent = `${outcome.code}. ${outcome.message}. Balances unchanged.`;
  };

  const flash = () => {
    panel.classList.add("is-moving");
    window.setTimeout(() => panel.classList.remove("is-moving"), 280);
  };

  const postTransfer = () => {
    const amount = selectedAmount();
    const previous = journal.get(key);
    let outcome: Outcome;
    if (previous) {
      outcome = previous.amountMinor === amount
        ? { kind: "replay", status: 200, transfer: previous }
        : {
            kind: "rejected",
            status: 409,
            code: "idempotency_conflict",
            message: "Key already used for a different transfer",
          };
    } else if (alice < amount) {
      outcome = {
        kind: "rejected",
        status: 409,
        code: "insufficient_funds",
        message: "Insufficient funds",
      };
    } else {
      const transfer: StoredTransfer = {
        id: crypto.randomUUID(),
        amountMinor: amount,
        createdAt: clock(new Date()),
      };
      alice -= amount;
      bob += amount;
      journal.set(key, transfer);
      outcome = { kind: "created", status: 201, transfer };
    }

    paintBalances();
    paintSlip(outcome);
    if (outcome.kind === "created") {
      result.textContent = `201 Created. ${pounds(amount)} left Alice Demo and reached Bob Demo together.`;
      flash();
    } else if (outcome.kind === "replay") {
      result.textContent = "200 OK. This key already posted that transfer, so the money was not moved again.";
    } else if (outcome.code === "insufficient_funds") {
      result.textContent = "409 Conflict. Insufficient funds. Nothing was stored, and this key was not kept.";
    } else {
      result.textContent = "409 Conflict. This key already belongs to a different transfer. Balances were left unchanged.";
    }
  };

  const restore = () => {
    alice = OPEN_ALICE;
    bob = OPEN_BOB;
    serial = 1;
    key = keyName(serial);
    journal.clear();
    const documented = amounts.find((input) => input.value === "2500");
    if (documented) documented.checked = true;
    paintBalances();
    paintSlip(null);
    result.textContent = "Example reset to £100.00 and £0.00. This desk does not call the API.";
  };

  newKey.addEventListener("click", () => {
    serial += 1;
    key = keyName(serial);
    keyNode.textContent = key;
    result.textContent = `Token is now ${key}. A new key can post a new transfer.`;
  });
  post.addEventListener("click", postTransfer);
  reset.addEventListener("click", restore);
  paintBalances();

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
    const next = root.dataset.selected === "neobank" && approach >= 0.82;
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
