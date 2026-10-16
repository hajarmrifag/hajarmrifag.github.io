/** Reveal a desk only when the camera has settled on that station. */
export function bindExhibit(
  root: HTMLElement,
  id: string,
  panel: HTMLElement,
  onShow?: () => void,
): void {
  let live = false;
  const sync = () => {
    const next = root.dataset.exhibit === id;
    if (next === live) return;
    live = next;
    panel.classList.toggle("is-live", next);
    panel.inert = !next;
    panel.setAttribute("aria-hidden", next ? "false" : "true");
    if (next) onShow?.();
  };
  sync();
  new MutationObserver(sync).observe(root, {
    attributes: true,
    attributeFilter: ["data-exhibit"],
  });
}
