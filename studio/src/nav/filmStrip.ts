const FRAME_KEY = /^[1-6]$/;

export interface StationSelectDetail {
  index: number;
  id: string;
  user: boolean;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "SELECT")
  );
}

export function mountFilmStrip(root: HTMLElement): void {
  const frames = [...root.querySelectorAll<HTMLElement>("[data-station]")];
  if (frames.length !== 6) return;

  let index = frames.findIndex((frame) => frame.classList.contains("is-selected"));
  if (index < 0) index = 0;

  const apply = (
    next: number,
    options: { focus?: boolean; scroll?: boolean; user?: boolean },
  ) => {
    index = (next + frames.length) % frames.length;
    for (const [frameIndex, frame] of frames.entries()) {
      const selected = frameIndex === index;
      frame.classList.toggle("is-selected", selected);
      frame.tabIndex = selected ? 0 : -1;
      if (selected) frame.setAttribute("aria-current", "true");
      else frame.removeAttribute("aria-current");
    }
    const id = frames[index].dataset.station ?? "";
    if (id) root.dataset.selected = id;
    if (options.user) root.dataset.stationUser = "true";
    const frame = frames[index];
    if (options.scroll) {
      frame.scrollIntoView({
        block: "nearest",
        inline: "nearest",
        behavior: prefersReducedMotion() ? "auto" : "smooth",
      });
    }
    if (options.focus) frame.focus({ preventScroll: true });
    root.dispatchEvent(
      new CustomEvent<StationSelectDetail>("nightfloor:station", {
        detail: { index, id, user: options.user === true },
      }),
    );
  };

  apply(index, { scroll: false });

  root.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const frame = event.target.closest<HTMLElement>("[data-station]");
    if (!frame || !root.contains(frame)) return;
    const next = frames.indexOf(frame);
    if (next >= 0) apply(next, { scroll: false, user: true });
  });

  window.addEventListener("keydown", (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey || isTypingTarget(event.target)) return;
    if (event.target instanceof Element && event.target.closest("[data-cuda-bench], [data-sourced-desk], [data-aegis-desk], [data-gridflex-desk], [data-neobank-desk]")) return;

    if (FRAME_KEY.test(event.key)) {
      event.preventDefault();
      apply(Number(event.key) - 1, { focus: true, scroll: true, user: true });
      return;
    }

    const inside =
      event.target instanceof Node && frames.some((frame) => frame.contains(event.target as Node));
    const horizontal = event.key === "ArrowLeft" || event.key === "ArrowRight";
    const vertical = event.key === "ArrowUp" || event.key === "ArrowDown";
    if (!horizontal && !(vertical && inside)) return;

    event.preventDefault();
    const delta = event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1;
    apply(index + delta, { focus: true, scroll: true, user: true });
  });
}
