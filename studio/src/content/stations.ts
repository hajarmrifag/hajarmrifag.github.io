export const STATION_ORDER = [
  "skyquery",
  "gridflex",
  "neobank",
  "aegis",
  "cuda",
  "sourced",
] as const;

export type StationId = (typeof STATION_ORDER)[number];

export interface Station {
  id: StationId;
  name: string;
  when: string;
  kind: string;
  href: string;
}

export function readStations(root: ParentNode): Station[] {
  const stations = [...root.querySelectorAll<HTMLElement>("[data-station]")].map((element) => {
    const link = element.querySelector("h2 a");
    const id = element.dataset.station ?? "";
    const name = link?.textContent?.trim() ?? "";
    const href = link?.getAttribute("href") ?? "";
    const when = element.dataset.when ?? "";
    const kind = element.dataset.kind ?? "";
    if (!STATION_ORDER.includes(id as StationId) || !name || !href || !when || !kind) {
      throw new Error(`Incomplete station markup: ${id || element.tagName}`);
    }
    return { id: id as StationId, name, when, kind, href };
  });

  const order = stations.map(({ id }) => id);
  if (!STATION_ORDER.every((id, index) => order[index] === id)) {
    throw new Error(`Unexpected station order: ${order.join(", ")}`);
  }
  return stations;
}
