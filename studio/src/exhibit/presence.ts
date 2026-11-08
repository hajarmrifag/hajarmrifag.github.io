/** Reveal a desk only when the camera has settled on that station. */
export function bindExhibit(
  root: HTMLElement,
  id: string,
  panel: HTMLElement,
  onShow?: () => void,
): void {
  const heading = panel.querySelector<HTMLElement>("[data-exhibit-heading]");
  const back = panel.querySelector<HTMLButtonElement>("[data-exhibit-back]");
  const scrollCue = panel.querySelector<HTMLElement>("[data-exhibit-scroll-cue]");
  let live = false;

  const syncScrollCue = () => {
    if (!live) return;
    const hasMore = panel.scrollHeight - panel.scrollTop - panel.clientHeight > 8;
    panel.classList.toggle("has-scroll-more", hasMore);
    if (scrollCue) scrollCue.hidden = !hasMore;
  };

  const enter = () => {
    panel.scrollTop = 0;
    onShow?.();
    syncScrollCue();
    queueMicrotask(() => {
      if (root.dataset.exhibit !== id) return;
      panel.scrollTop = 0;
      syncScrollCue();
      heading?.focus({ preventScroll: true });
    });
  };

  const sync = () => {
    const next = root.dataset.exhibit === id;
    if (next === live) return;
    live = next;
    panel.classList.toggle("is-live", next);
    panel.inert = !next;
    panel.setAttribute("aria-hidden", next ? "false" : "true");
    if (next) enter();
    else panel.classList.remove("has-scroll-more");
  };

  back?.addEventListener("click", () => {
    root.dispatchEvent(new CustomEvent("nightfloor:leave-station"));
  });
  panel.addEventListener("scroll", syncScrollCue, { passive: true });
  new ResizeObserver(syncScrollCue).observe(panel);
  sync();
  new MutationObserver(sync).observe(root, {
    attributes: true,
    attributeFilter: ["data-exhibit"],
  });
}
