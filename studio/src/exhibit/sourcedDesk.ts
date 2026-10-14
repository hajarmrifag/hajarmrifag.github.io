/**
 * Reading-desk check for the fictional Harborlight demo listing.
 * Outcomes follow the rule-eligibility adapter in opportunity-compass:
 * an unconfirmed Passport checks nothing, a missing value stays unknown,
 * and unknown does not satisfy a mandatory requirement.
 */

type Passport = "unconfirmed" | "missing" | "confirmed";
type Line = "listing" | "funding" | "apply" | "degree" | "python" | "english" | "work";
type Status = "unknown" | "met";

interface RequirementRow {
  status: Status;
  label: string;
  reason: string;
  studentValue: string;
  note?: string;
}

const LINES: Line[] = ["listing", "funding", "apply", "degree", "python", "english", "work"];
const PASSPORTS: Passport[] = ["unconfirmed", "missing", "confirmed"];
const SOURCE = "Fictional demo listing";
const NOT_PROVIDED = "Not provided";

const LABELS = {
  degree: "Enrolled in a Bachelor's or Master's",
  python: "Python",
  english: "English",
  work: "Right to work in Portugal",
} as const;

function row(
  status: Status,
  label: string,
  reason: string,
  studentValue: string,
  note?: string,
): RequirementRow {
  return { status, label, reason, studentValue, ...(note ? { note } : {}) };
}

/** The three Passport positions this desk can apply to the one demo listing. */
function evaluate(passport: Passport): { verdict: string; requirements: Record<keyof typeof LABELS, RequirementRow> } {
  const unchecked = {
    degree: row("unknown", LABELS.degree, "Confirm your Passport to check this", NOT_PROVIDED),
    python: row("unknown", LABELS.python, "Confirm your Passport to check this", NOT_PROVIDED),
    english: row("unknown", LABELS.english, "Confirm your Passport to check this", NOT_PROVIDED),
    work: row("unknown", LABELS.work, "Confirm your Passport to check this", NOT_PROVIDED),
  };

  if (passport === "unconfirmed") {
    return {
      verdict:
        "Needs confirmation. Maya’s fictional demo Passport includes a bachelor’s degree, Python, and English, but it is not confirmed, so nothing has been checked.",
      requirements: unchecked,
    };
  }

  if (passport === "missing") {
    return {
      verdict:
        "Needs confirmation. Degree, skills, and languages are not provided. Right to work cannot be checked automatically. Missing information never counts as met.",
      requirements: {
        degree: row("unknown", LABELS.degree, "Degree level missing from Passport", NOT_PROVIDED),
        python: row("unknown", LABELS.python, "No skills listed in Passport", NOT_PROVIDED),
        english: row("unknown", LABELS.english, "No languages listed in Passport", NOT_PROVIDED),
        work: row(
          "unknown",
          LABELS.work,
          "Cannot be checked automatically. Verify yourself",
          NOT_PROVIDED,
          "Confirm on the official site.",
        ),
      },
    };
  }

  return {
    verdict:
      "Needs confirmation. Bachelor’s, Python, and English match the listed values. Right to work in Portugal is still unknown, so this is not marked eligible. Missing information never counts as met.",
    requirements: {
      degree: row("met", LABELS.degree, "Passport: Bachelor's", "Bachelor's"),
      python: row("met", LABELS.python, "Passport lists Python", "Python"),
      english: row(
        "met",
        LABELS.english,
        "Passport lists English",
        "English",
        "Required proficiency level is not checked automatically.",
      ),
      work: row(
        "unknown",
        LABELS.work,
        "Cannot be checked automatically. Verify yourself",
        NOT_PROVIDED,
        "Confirm on the official site.",
      ),
    },
  };
}

function evidence(line: Line, requirement?: RequirementRow): string {
  if (line === "listing") {
    return "These details are written in the fictional demo record. There is no source link, nothing was retrieved, and last verified is never. They are not verified opportunity facts.";
  }
  if (line === "funding") {
    return "Tuition is marked not covered. Living support is marked partial: “Monthly stipend stated; amount vs. living costs unknown.” Payment timing is “Monthly, in arrears.” Travel support is unknown. None of this comes from a source page.";
  }
  if (line === "apply") {
    return "There is no application link. Demo cards have no real apply links.";
  }
  if (!requirement) return "";
  const note = requirement.note ? ` ${requirement.note}` : "";
  const statusWord = requirement.status === "met" ? "Met" : "Unknown";
  return `The fictional listing states “${requirement.label}.” Status: ${statusWord}. ${requirement.reason}. Your value: ${requirement.studentValue}. Source: ${SOURCE}.${note}`;
}

function isPassport(value: string): value is Passport {
  return PASSPORTS.some((passport) => passport === value);
}

function isLine(value: string): value is Line {
  return LINES.some((line) => line === value);
}

/** Document and eligibility glass for the Sourced station. Hidden until that station is approached. */
export function mountSourcedDesk(root: HTMLElement): void {
  const panel = root.querySelector<HTMLElement>("[data-sourced-desk]");
  if (!panel) return;

  const lines = [...panel.querySelectorAll<HTMLInputElement>('input[name="sourced-line"]')];
  const passports = [...panel.querySelectorAll<HTMLInputElement>('input[name="sourced-passport"]')];
  const readout = panel.querySelector<HTMLElement>("[data-loupe-read]");
  const verdict = panel.querySelector<HTMLElement>("[data-verdict]");
  const states = [...panel.querySelectorAll<HTMLElement>("[data-req]")];
  if (!readout || !verdict || lines.length !== LINES.length || passports.length !== PASSPORTS.length) return;

  const selectedLine = (): Line => {
    const value = lines.find((line) => line.checked)?.value ?? "listing";
    return isLine(value) ? value : "listing";
  };
  const selectedPassport = (): Passport => {
    const value = passports.find((passport) => passport.checked)?.value ?? "unconfirmed";
    return isPassport(value) ? value : "unconfirmed";
  };

  const show = () => {
    const passport = selectedPassport();
    const result = evaluate(passport);
    const line = selectedLine();
    for (const state of states) {
      const key = state.dataset.req;
      if (key !== "degree" && key !== "python" && key !== "english" && key !== "work") continue;
      const requirement = result.requirements[key];
      const text = requirement.status === "met" ? "Met" : "Unknown";
      state.textContent = text;
      state.dataset.status = requirement.status;
      state.setAttribute("aria-label", `${requirement.label}: ${text}. ${requirement.reason}`);
    }
    const requirement = line === "degree" || line === "python" || line === "english" || line === "work"
      ? result.requirements[line]
      : undefined;
    readout.textContent = evidence(line, requirement);
    verdict.textContent = result.verdict;
  };

  for (const input of [...lines, ...passports]) {
    input.addEventListener("change", () => {
      if (input.checked) show();
    });
  }
  show();

  const place = () => {
    const lede = document.querySelector(".lede");
    const dock = document.querySelector(".work");
    if (!lede || !dock) return;
    const ledeBottom = lede.getBoundingClientRect().bottom;
    const dockTop = dock.getBoundingClientRect().top;
    const top = ledeBottom + 8;
    const gap = window.innerWidth < 900 ? 18 : 14;
    panel.style.top = `${top}px`;
    panel.style.maxHeight = `${Math.max(180, dockTop - top - gap)}px`;
  };

  let live = false;
  const sync = () => {
    const approach = Number(root.dataset.approach ?? "0");
    const next = root.dataset.selected === "sourced" && approach >= 0.82;
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
