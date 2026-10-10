const FRAME_KEY = /^[1-6]$/;

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

  const apply = (next: number, options: { focus?: boolean; scroll?: boolean }) => {
    index = (next + frames.length) % frames.length;
    for (const [frameIndex, frame] of frames.entries()) {
      const selected = frameIndex === index;
      frame.classList.toggle("is-selected", selected);
      frame.tabIndex = selected ? 0 : -1;
      if (selected) frame.setAttribute("aria-current", "true");
      else frame.removeAttribute("aria-current");
    }
    const station = frames[index].dataset.station;
    if (station) root.dataset.selected = station;
    const frame = frames[index];
    if (options.scroll) {
      frame.scrollIntoView({
        block: "nearest",
        inline: "nearest",
        behavior: prefersReducedMotion() ? "auto" : "smooth",
      });
    }
    if (options.focus) frame.focus({ preventScroll: true });
  };

  apply(index, { scroll: false });

  root.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const frame = event.target.closest<HTMLElement>("[data-station]");
    if (!frame || !root.contains(frame)) return;
    const next = frames.indexOf(frame);
    if (next >= 0) apply(next, { scroll: false });
  });

  window.addEventListener("keydown", (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey || isTypingTarget(event.target)) return;

    if (FRAME_KEY.test(event.key)) {
      event.preventDefault();
      apply(Number(event.key) - 1, { focus: true, scroll: true });
      return;
    }

    const inside =
      event.target instanceof Node && frames.some((frame) => frame.contains(event.target as Node));
    const horizontal = event.key === "ArrowLeft" || event.key === "ArrowRight";
    const vertical = event.key === "ArrowUp" || event.key === "ArrowDown";
    if (!horizontal && !(vertical && inside)) return;

    event.preventDefault();
    const delta = event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1;
    apply(index + delta, { focus: true, scroll: true });
  });
}
