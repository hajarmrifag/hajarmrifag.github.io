// Progressive enhancement: reading and navigation work without motion or JavaScript.
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const casePage = document.body.classList.contains("case-page");
const chapters = [
  ...document.querySelectorAll(
    casePage
      ? ".case-hero, .case-section"
      : ".intro, #experience, #gridflex, .project-row, #about, #contact",
  ),
];
const animations = new Set();
let manuallyPaused = false;
const motionDisabled = () => reducedMotion.matches || manuallyPaused;
let activeIndex = -1;
let frame = 0;

function animate(element, keyframes, options) {
  if (motionDisabled() || !element.animate) return;
  const animation = element.animate(keyframes, options);
  animations.add(animation);
  animation.finished
    .catch(() => {})
    .finally(() => animations.delete(animation));
}

if (chapters.length) {
  const progress = document.createElement("div");
  progress.className = "reading-progress";
  progress.setAttribute("aria-hidden", "true");
  document.body.append(progress);

  const dock = document.createElement("nav");
  dock.className = "chapter-dock";
  dock.setAttribute("aria-label", "Reading navigation");
  const previous = document.createElement("button");
  previous.type = "button";
  previous.className = "chapter-step";
  previous.textContent = "↑";
  previous.setAttribute("aria-label", "Previous section");
  const current = document.createElement("a");
  current.className = "chapter-current";
  const count = document.createElement("span");
  count.className = "chapter-count";
  const title = document.createElement("span");
  title.className = "chapter-title";
  current.append(count, title);
  const next = document.createElement("button");
  next.type = "button";
  next.className = "chapter-step";
  next.textContent = "↓";
  next.setAttribute("aria-label", "Next section");
  const percentage = document.createElement("span");
  percentage.className = "reading-percent";
  percentage.setAttribute("aria-hidden", "true");
  const motionToggle = document.createElement("button");
  motionToggle.type = "button";
  motionToggle.className = "chapter-step motion-toggle";
  function syncMotionControl() {
    const disabled = motionDisabled();
    document.body.classList.toggle("motion-paused", disabled);
    motionToggle.textContent = disabled ? "▶" : "Ⅱ";
    motionToggle.setAttribute(
      "aria-label",
      reducedMotion.matches
        ? "Motion disabled by system preference"
        : disabled
          ? "Enable motion"
          : "Pause motion",
    );
    motionToggle.title = motionToggle.getAttribute("aria-label");
    motionToggle.disabled = reducedMotion.matches;
  }
  motionToggle.addEventListener("click", () => {
    manuallyPaused = !manuallyPaused;
    for (const animation of animations) animation.cancel();
    syncMotionControl();
    scheduleUpdate();
  });
  syncMotionControl();
  dock.append(previous, current, next, motionToggle, percentage);
  document.body.append(dock);

  const labels = chapters.map((chapter, index) => {
    if (!chapter.id) chapter.id = `chapter-${index + 1}`;
    if (chapter.matches(".intro, .case-hero"))
      return casePage
        ? document.querySelector("h1").textContent.trim()
        : "Introduction";
    if (chapter.id === "experience") return "Internship";
    if (chapter.id === "contact") return "Get in touch";
    if (chapter.matches(".case-section")) {
      return (
        chapter
          .querySelector(".eyebrow")
          ?.textContent.replace(/^\s*\d+\s*\/\s*/, "")
          .trim() || `Section ${index + 1}`
      );
    }
    return (
      chapter
        .querySelector("h2, h3")
        ?.textContent.replace(/\s+/g, " ")
        .trim() || `Section ${index + 1}`
    );
  });

  function goTo(index) {
    chapters[Math.max(0, Math.min(index, chapters.length - 1))].scrollIntoView({
      behavior: motionDisabled() ? "instant" : "smooth",
      block: "start",
    });
  }
  previous.addEventListener("click", () => goTo(activeIndex - 1));
  next.addEventListener("click", () => goTo(activeIndex + 1));

  const images = [
    ...document.querySelectorAll(".featured-image img, .case-shot img"),
  ];
  const imageContainers = images.map((image) => image.parentElement);
  function update() {
    frame = 0;
    const height = window.innerHeight;
    const scrollable = document.documentElement.scrollHeight - height;
    const ratio =
      scrollable > 0
        ? Math.max(0, Math.min(1, window.scrollY / scrollable))
        : 0;
    progress.style.transform = `scaleX(${ratio})`;
    percentage.textContent = `${Math.round(ratio * 100)}%`;
    let index = 0;
    chapters.forEach((chapter, i) => {
      const rect = chapter.getBoundingClientRect();
      if (rect.top <= height * 0.38) index = i;
      const sectionProgress = Math.max(
        0,
        Math.min(1, (height * 0.38 - rect.top) / Math.max(1, rect.height)),
      );
      chapter.style.setProperty(
        "--section-progress",
        sectionProgress.toFixed(3),
      );
    });
    if (ratio > 0.995 && window.scrollY > 0) index = chapters.length - 1;
    if (index !== activeIndex) {
      if (activeIndex >= 0)
        chapters[activeIndex].classList.remove("is-reading");
      activeIndex = index;
      chapters[index].classList.add("is-reading");
      count.textContent = `${String(index + 1).padStart(2, "0")} / ${String(chapters.length).padStart(2, "0")}`;
      title.textContent = labels[index];
      current.href = `#${chapters[index].id}`;
      current.setAttribute("aria-label", `Current section: ${labels[index]}`);
      previous.disabled = index === 0;
      next.disabled = index === chapters.length - 1;
      animate(
        title,
        [
          { opacity: 0, transform: "translateY(6px)" },
          { opacity: 1, transform: "translateY(0)" },
        ],
        { duration: 240, easing: "ease-out" },
      );
    }
    images.forEach((image, i) => {
      const rect = imageContainers[i].getBoundingClientRect();
      const offset = motionDisabled()
        ? 0
        : Math.max(
            -12,
            Math.min(12, (rect.top + rect.height / 2 - height / 2) * 0.025),
          );
      image.style.setProperty("--image-drift", `${offset.toFixed(2)}px`);
    });
  }
  function scheduleUpdate() {
    if (!frame) frame = requestAnimationFrame(update);
  }
  window.addEventListener("scroll", scheduleUpdate, { passive: true });
  window.addEventListener("resize", scheduleUpdate, { passive: true });
  window.addEventListener("load", scheduleUpdate, { once: true });
  document.fonts?.ready.then(scheduleUpdate);
  if ("ResizeObserver" in window)
    new ResizeObserver(scheduleUpdate).observe(document.body);
  reducedMotion.addEventListener("change", () => {
    for (const animation of animations) animation.cancel();
    syncMotionControl();
    scheduleUpdate();
  });
  update();
}

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const element = entry.target;
        observer.unobserve(element);
        animate(
          element,
          [
            { opacity: 0.15, transform: "translateY(28px)" },
            { opacity: 1, transform: "translateY(0)" },
          ],
          { duration: 750, easing: "cubic-bezier(.2,.7,.2,1)" },
        );
        element
          .querySelectorAll(
            ".project-evidence > div, .ownership-grid > div, .workflow-grid > div",
          )
          .forEach((child, index) => {
            animate(
              child,
              [
                { opacity: 0.3, transform: "translateY(16px)" },
                { opacity: 1, transform: "translateY(0)" },
              ],
              {
                duration: 650,
                delay: 90 * index,
                easing: "cubic-bezier(.2,.7,.2,1)",
              },
            );
          });
        element
          .querySelectorAll(".track i, .bar-track span")
          .forEach((bar, index) => {
            animate(
              bar,
              [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }],
              {
                duration: 900,
                delay: index * 70,
                easing: "cubic-bezier(.2,.7,.2,1)",
              },
            );
          });
      }
    },
    { threshold: 0.06 },
  );
  document
    .querySelectorAll(
      ".intro > div, .intro-facts, .experience, .section-heading, .featured, .project-row, .about, .contact-layout, .case-hero, .case-shot, .case-section",
    )
    .forEach((element) => observer.observe(element));
}

// Pointer light follows the cursor only on devices with an accurate hovering pointer.
if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
  document
    .querySelectorAll(
      ".featured-image, .ownership-grid > div, .workflow-grid > div, .cuda-comparison",
    )
    .forEach((card) => {
      card.classList.add("pointer-light");
      let pointerFrame = 0;
      let x = 0;
      let y = 0;
      card.addEventListener(
        "pointermove",
        (event) => {
          if (motionDisabled()) return;
          const rect = card.getBoundingClientRect();
          x = event.clientX - rect.left;
          y = event.clientY - rect.top;
          if (!pointerFrame)
            pointerFrame = requestAnimationFrame(() => {
              pointerFrame = 0;
              card.style.setProperty("--pointer-x", `${x}px`);
              card.style.setProperty("--pointer-y", `${y}px`);
            });
        },
        { passive: true },
      );
    });
}
