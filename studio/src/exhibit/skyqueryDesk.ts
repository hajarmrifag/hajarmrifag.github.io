/**
 * Split desk for the SkyQuery internship.
 * The analysis path and the FastAPI prototype stay separate.
 * Copy follows the case study and revision d1892fa.
 * This desk does not call the API or a language model.
 */

const PIN = "d1892fa";

const PROMPTS = [
  "Show me the cheapest flights from JFK",
  "Compare average fares between Delta and American Airlines",
  "What is the average fare for non-stop vs connecting flights?",
] as const;

const SCHEMA: Record<string, string> = {
  flights: `Table: flights
Columns: legId TEXT, searchDate TEXT, flightDate TEXT,
startingAirport TEXT (IATA origin code e.g. ATL),
destinationAirport TEXT (IATA destination code),
isBasicEconomy TEXT, isRefundable TEXT, isNonStop TEXT,
baseFare REAL, totalFare REAL (total price in USD),
seatsRemaining INTEGER, totalTravelDistance REAL (miles),
airline_name TEXT (primary airline name - use this for all airline queries),
segmentsEquipmentDescription TEXT,
segmentsCabinCode TEXT`,
  airports: `Table: airports
Columns: id INTEGER, ident TEXT, type TEXT, name TEXT,
latitude_deg REAL, longitude_deg REAL, elevation_ft REAL,
continent TEXT, iso_country TEXT, iso_region TEXT,
municipality TEXT, scheduled_service TEXT,
iata_code TEXT (JOIN to flights.startingAirport or destinationAirport)`,
  runways: `Table: runways
Columns: id INTEGER, airport_ref INTEGER, airport_ident TEXT,
length_ft REAL, width_ft REAL, surface TEXT,
lighted INTEGER, closed INTEGER`,
};

type Stage = "hdfs" | "hive" | "spark" | "record";
type Outcome = "execute" | "prefix" | "exhausted";

const STAGES: Record<Stage, { kicker: string; line: string }> = {
  hdfs: {
    kicker: "HDFS upload",
    line: "My script creates /data/aviation/flights, airports, runways, countries, regions, and results, then puts itineraries_sample.csv, airports.csv, runways.csv, countries.csv, and regions.csv. The analytics project is the documented 15 million Expedia records. This file name is what the splicing job opens.",
  },
  hive: {
    kicker: "Hive tables",
    line: "My external tables sit on those HDFS paths: flights, airports, runways, countries, and regions. They are comma-separated text, and the header row is skipped. The query prototype beside this leaf does not read these tables.",
  },
  spark: {
    kicker: "PySpark splicing",
    line: "The recorded job reads hdfs://localhost:9000/data/aviation/flights/itineraries_sample.csv. It keeps one date of nonstop flights in cache, joins possible legs, and releases the cache. A connection needs a layover from 90 to 480 minutes, and the script keeps at most 10 rows for that date. I also wrote the aircraft, runway, body-type, alliance, weather, brand, and rail jobs. Their results stay in the repository.",
  },
  record: {
    kicker: "Recorded run",
    line: "95 flight dates. 950 comparison rows. The log repeats rows, so this is not 950 unique routes. LGA → CLT → ATL, Delta then American Airlines, layover 388 minutes. Combined fare $795.70. Direct fare $2,057.61. A historical fare comparison, not a booked ticket and not a proven best fare.",
  },
};

function schemaFor(tables: string[]): string {
  if (tables.length === 0) return Object.values(SCHEMA).join("\n\n");
  return tables
    .map((table) => SCHEMA[table] ?? `Table: ${table} (schema not available)`)
    .join("\n\n");
}

/** Desk readout for the SkyQuery station. Hidden until that station is approached. */
export function mountSkyQuery(root: HTMLElement): void {
  const panel = root.querySelector<HTMLElement>("[data-skyquery-desk]");
  if (!panel) return;

  const stageButtons = [...panel.querySelectorAll<HTMLButtonElement>("[data-stage]")];
  const promptButtons = [...panel.querySelectorAll<HTMLButtonElement>("[data-prompt]")];
  const outcomeButtons = [...panel.querySelectorAll<HTMLButtonElement>("[data-outcome]")];
  const tableInputs = [...panel.querySelectorAll<HTMLInputElement>('input[name="sq-table"]')];
  const kicker = panel.querySelector<HTMLElement>("[data-stage-kicker]");
  const line = panel.querySelector<HTMLElement>("[data-stage-line]");
  const diff = panel.querySelector<HTMLElement>("[data-stage-diff]");
  const rail = panel.querySelector<HTMLElement>("[data-rail]");
  const status = panel.querySelector<HTMLElement>("[data-sql-status]");
  const seal = panel.querySelector<HTMLElement>("[data-sql-seal]");
  const slipLine = panel.querySelector<HTMLElement>("[data-sql-line]");
  const schemaNote = panel.querySelector<HTMLElement>("[data-schema-note]");
  if (!kicker || !line || !diff || !rail || !status || !seal || !slipLine || !schemaNote) return;
  if (stageButtons.length !== 4 || promptButtons.length !== 3 || outcomeButtons.length !== 3) return;

  let stage: Stage = "hdfs";
  let prompt = 0;
  let outcome: Outcome = "execute";

  const selectedTables = () => tableInputs.filter((input) => input.checked).map((input) => input.value);

  const paintStage = () => {
    const plate = STAGES[stage];
    kicker.textContent = plate.kicker;
    line.textContent = plate.line;
    diff.hidden = stage !== "record";
    const index = stageButtons.findIndex((button) => button.dataset.stage === stage);
    const button = stageButtons[index];
    if (button) rail.style.setProperty("--sq-at", `${button.offsetTop + button.offsetHeight / 2}px`);
    for (const button of stageButtons) {
      button.setAttribute("aria-pressed", button.dataset.stage === stage ? "true" : "false");
    }
  };

  const paintSql = () => {
    const question = PROMPTS[prompt] ?? PROMPTS[0];
    const tables = selectedTables();
    const tableLabel = tables.length === 0 ? "every stored description" : tables.join(", ");
    for (const button of promptButtons) {
      button.setAttribute("aria-pressed", Number(button.dataset.prompt) === prompt ? "true" : "false");
    }
    for (const button of outcomeButtons) {
      button.setAttribute("aria-pressed", button.dataset.outcome === outcome ? "true" : "false");
    }

    if (outcome === "prefix") {
      status.textContent = "A statement that does not start with SELECT or WITH stops at the prefix check.";
      seal.textContent = "HTTP 400";
      slipLine.textContent = `Only SELECT or WITH queries are permitted! The route returns that ValueError as HTTP 400 and does not retry. Prompt from the interface: “${question}”. No SQL for it was saved.`;
    } else if (outcome === "exhausted") {
      status.textContent = "A retryable execution error can be sent back to the model at most three times.";
      seal.textContent = "HTTP 500";
      slipLine.textContent = `The next prompt receives “HQL:” plus the previous SQL and “Error:” plus the message. After three attempts the route says the query failed after 3 attempts. Prompt from the interface: “${question}”. Schema sent: ${tableLabel}. No failed SQL for it was saved.`;
    } else {
      status.textContent = "A SELECT or WITH statement would run on SQLite and return at most 100 rows.";
      seal.textContent = "No saved SQL";
      slipLine.textContent = `The model is asked for SQLite, raw SQL, and LIMIT 100, using ${tableLabel}. A first success reports correction_attempts 0. Prompt from the interface: “${question}”. The repository does not store the SQL or rows.`;
    }

    schemaNote.textContent = `${schemaFor(tables)}\n\nThe analytics project is documented as 15 million Expedia records. This schema is a static dictionary, and execution is SQLite with at most 100 rows. A table name outside these three is marked schema not available. The route is still named text_to_hql. Revision ${PIN}.`;
  };

  for (const button of stageButtons) {
    button.addEventListener("click", () => {
      const next = button.dataset.stage;
      if (next === "hdfs" || next === "hive" || next === "spark" || next === "record") {
        stage = next;
        paintStage();
      }
    });
  }
  for (const button of promptButtons) {
    button.addEventListener("click", () => {
      prompt = Number(button.dataset.prompt);
      paintSql();
    });
  }
  for (const button of outcomeButtons) {
    button.addEventListener("click", () => {
      const next = button.dataset.outcome;
      if (next === "execute" || next === "prefix" || next === "exhausted") {
        outcome = next;
        paintSql();
      }
    });
  }
  for (const input of tableInputs) input.addEventListener("change", paintSql);

  paintStage();
  paintSql();

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
    const next = root.dataset.selected === "skyquery" && approach >= 0.82;
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
