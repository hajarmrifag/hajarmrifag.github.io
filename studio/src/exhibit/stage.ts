const placers = new Set<() => void>();
let frame = 0;

function flush(): void {
  frame = 0;
  for (const place of placers) place();
}

function schedule(): void {
  if (frame) return;
  frame = requestAnimationFrame(flush);
}

/**
 * One layout pass for every desk. Separate observers were reading and writing
 * geometry on the same frames as the header transition.
 */
export function watchStage(place: () => void): void {
  placers.add(place);
  if (placers.size === 1) {
    const observer = new ResizeObserver(schedule);
    observer.observe(document.documentElement);
    for (const selector of [".mast", ".lede", ".work"]) {
      const node = document.querySelector(selector);
      if (node) observer.observe(node);
    }
  }
  place();
}
