export interface Station {
  id: string;
  name: string;
  when: string;
  kind: string;
  href: string;
}

export function readStations(root: ParentNode): Station[] {
  return [...root.querySelectorAll<HTMLElement>("[data-station]")].map((element) => {
    const link = element.querySelector("h2 a");
    const id = element.dataset.station ?? "";
    const name = link?.textContent?.trim() ?? "";
    const href = link?.getAttribute("href") ?? "";
    const when = element.dataset.when ?? "";
    const kind = element.dataset.kind ?? "";
    if (!id || !name || !href || !when || !kind) {
      throw new Error(`Incomplete station markup: ${id || element.tagName}`);
    }
    return { id, name, when, kind, href };
  });
}
