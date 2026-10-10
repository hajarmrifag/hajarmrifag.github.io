// Progressive enhancement: reading and navigation work without motion or JavaScript.
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const casePage = document.body.classList.contains("case-page");
const chapters = [
  ...document.querySelectorAll(
    casePage
      ? ".case-hero, .case-section"
      : "#intro, #work, #practice, #path, #contact",
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

  if (!casePage) {
    const images = [
      ...document.querySelectorAll(".spread-shot img, .case-shot img"),
    ];
    const imageContainers = images.map((image) => image.parentElement);
    const updateHome = () => {
      frame = 0;
      const height = window.innerHeight;
      const scrollable = document.documentElement.scrollHeight - height;
      const ratio =
        scrollable > 0
          ? Math.max(0, Math.min(1, window.scrollY / scrollable))
          : 0;
      progress.style.transform = `scaleX(${ratio})`;
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
    };
    const scheduleHome = () => {
      if (!frame) frame = requestAnimationFrame(updateHome);
    };
    window.addEventListener("scroll", scheduleHome, { passive: true });
    window.addEventListener("resize", scheduleHome, { passive: true });
    reducedMotion.addEventListener("change", () => {
      for (const animation of animations) animation.cancel();
      scheduleHome();
    });
    updateHome();
  } else {
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
    if (chapter.matches("#intro, .intro, .case-hero"))
      return casePage
        ? document.querySelector("h1").textContent.trim()
        : "Introduction";
    if (chapter.id === "work") return "Selected work";
    if (chapter.id === "practice") return "Practice";
    if (chapter.id === "path") return "Path";
    if (chapter.id === "contact") return "Contact";
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
    ...document.querySelectorAll(".spread-shot img, .case-shot img"),
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
      ".hero-grid, .fact-strip, .section-head, .spread, .ledger, .practice-grid, .path-list, .contact-layout, .case-hero, .case-shot, .case-section",
    )
    .forEach((element) => observer.observe(element));
}

const stage = document.querySelector("[data-stage]");
if (stage) {
  const tabs = [...stage.querySelectorAll('[role="tab"]')];
  const panels = [...stage.querySelectorAll('[role="tabpanel"]')];
  let current = Math.max(0, tabs.findIndex((tab) => tab.getAttribute("aria-selected") === "true"));
  stage.classList.add("is-live");

  function showFrame(panel, index) {
    const frames = [...panel.querySelectorAll("[data-frame]")];
    const dots = [...panel.querySelectorAll("[data-frame-dot]")];
    frames.forEach((frameImage, i) => {
      const on = i === index;
      frameImage.classList.toggle("is-shown", on);
      frameImage.toggleAttribute("aria-hidden", !on);
    });
    dots.forEach((dot, i) => dot.setAttribute("aria-pressed", i === index ? "true" : "false"));
  }

  function select(index) {
    if (index === current && stage.classList.contains("is-ready")) return;
    current = index;
    tabs.forEach((tab, i) => {
      const on = i === index;
      tab.setAttribute("aria-selected", on ? "true" : "false");
      tab.tabIndex = on ? 0 : -1;
    });
    panels.forEach((panel, i) => {
      const on = i === index;
      panel.classList.toggle("is-active", on);
      panel.hidden = !on;
      if (on && !motionDisabled()) {
        animate(
          panel,
          [
            { opacity: 0, transform: "translateY(8px)" },
            { opacity: 1, transform: "translateY(0)" },
          ],
          { duration: 260, easing: "ease-out" },
        );
      }
    });
    stage.classList.add("is-ready");
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => select(index));
    tab.addEventListener("pointerenter", (event) => {
      if (event.pointerType === "touch") return;
      select(index);
    });
    tab.addEventListener("keydown", (event) => {
      let next = null;
      if (event.key === "ArrowDown" || event.key === "ArrowRight") next = (index + 1) % tabs.length;
      if (event.key === "ArrowUp" || event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
      if (event.key === "Home") next = 0;
      if (event.key === "End") next = tabs.length - 1;
      if (next === null) return;
      event.preventDefault();
      select(next);
      tabs[next].focus();
    });
  });

  panels.forEach((panel) => {
    panel.querySelectorAll("[data-frame-dot]").forEach((dot, index) => {
      dot.addEventListener("click", () => showFrame(panel, index));
    });
  });

  select(current);
}

const menu = document.querySelector(".nav-disclosure");
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && menu?.open) {
    menu.open = false;
    menu.querySelector("summary")?.focus();
  }
});
