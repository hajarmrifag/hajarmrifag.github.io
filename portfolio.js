(() => {
  "use strict";
  document.documentElement.classList.add("js-enabled");
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [
    ...root.querySelectorAll(selector),
  ];
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

  // A clock for the location shown in the introduction; no network request.
  const clock = $("[data-clock]");
  const clockFormat = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const updateClock = () => {
    clock.textContent = clockFormat.format(new Date());
  };
  updateClock();
  setInterval(updateClock, 60_000);

  const progress = $(".reading-progress");
  let scrollPending = false;
  const updateProgress = () => {
    const distance = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${distance > 0 ? Math.min(1, Math.max(0, scrollY / distance)) : 0})`;
    scrollPending = false;
  };
  addEventListener(
    "scroll",
    () => {
      if (!scrollPending) {
        scrollPending = true;
        requestAnimationFrame(updateProgress);
      }
    },
    { passive: true },
  );
  addEventListener("resize", updateProgress, { passive: true });
  updateProgress();

  const projects = $$("[data-category]");
  const filters = $$("[data-filter]");
  const projectGrid = $(".project-grid");
  function setFilter(value) {
    let shown = 0;
    for (const project of projects) {
      project.hidden =
        value !== "all" && !project.dataset.category.split(" ").includes(value);
      if (!project.hidden) shown++;
    }
    filters.forEach((button) =>
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.filter === value),
      ),
    );
    projectGrid.hidden = $$(".project", projectGrid).every(
      (project) => project.hidden,
    );
    $("[data-filter-status]").textContent =
      `Showing ${shown} ${shown === 1 ? "project" : "projects"}${value === "all" ? "" : ` in ${value}`}.`;
    updateProgress();
  }
  filters.forEach((button) =>
    button.addEventListener("click", () => setFilter(button.dataset.filter)),
  );
  function revealHashTarget() {
    const target = document.getElementById(location.hash.slice(1));
    if (target?.matches("[data-category]") && target.hidden) {
      setFilter("all");
      target.scrollIntoView({
        behavior: reducedMotion.matches ? "instant" : "smooth",
      });
    }
  }
  addEventListener("hashchange", revealHashTarget);

  // Native dialog contains focus; explicit Escape also handles search inputs.
  const dialog = $(".command-dialog");
  const search = $("#command-search");
  const destinations = $$("[data-command]", dialog);
  let commandReturnFocus = $("[data-open-command]");
  const openCommand = () => {
    commandReturnFocus =
      document.activeElement === document.body
        ? $("[data-open-command]")
        : document.activeElement;
    search.value = "";
    destinations.forEach((link) => {
      link.hidden = false;
    });
    $(".command-empty").hidden = true;
    if (!dialog.open) dialog.showModal();
    search.focus();
  };
  $("[data-open-command]").addEventListener("click", openCommand);
  $("[data-close-command]").addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => {
    commandReturnFocus?.focus({ preventScroll: true });
  });
  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )
      dialog.close();
  });
  document.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      if (dialog.open) dialog.close();
      else openCommand();
    }
  });
  search.addEventListener("input", () => {
    const query = search.value.toLowerCase().trim();
    destinations.forEach((link) => {
      link.hidden = !`${link.dataset.command} ${link.textContent}`
        .toLowerCase()
        .includes(query);
    });
    $(".command-empty").hidden = destinations.some((link) => !link.hidden);
  });
  dialog.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      dialog.close();
      return;
    }
    const visible = destinations.filter((link) => !link.hidden);
    const current = visible.indexOf(document.activeElement);
    if (
      (event.key === "ArrowDown" || event.key === "ArrowUp") &&
      visible.length
    ) {
      event.preventDefault();
      const next =
        event.key === "ArrowDown"
          ? (current + 1) % visible.length
          : current <= 0
            ? visible.length - 1
            : current - 1;
      visible[next].focus();
    } else if (
      event.key === "Enter" &&
      event.target === search &&
      visible.length
    ) {
      event.preventDefault();
      visible[0].click();
    }
  });
  destinations.forEach((link) =>
    link.addEventListener("click", () => {
      if (link.getAttribute("href").startsWith("#")) setFilter("all");
      dialog.close();
    }),
  );
})();
