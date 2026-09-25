# Hajar Mrifag — engineering portfolio

[Visit the portfolio](https://hajarmrifag.github.io/)

A personal software engineering portfolio with four selected projects, a hands-on engineering playground and a detailed GridFlex case study. The work connects directly to source code, tests and measured results.

## Try the engineering

The first screen contains four interactive experiments. Each can also be opened in an expanded dialog from its project card; state survives switching tabs and closing the dialog.

- **Claims:** switch between Adjuster, Manager and Admin, request a status change, and inspect the audit history. Unauthorized changes are rejected; repeating the current status adds no duplicate event.
- **CUDA:** select a matrix size and compare the recorded naïve, shared-memory, register-tiled and cuBLAS results. Every bar and ratio uses the selected workload.
- **Banking:** commit a sample transfer, replay the same request, inject a failure or try to overdraw. Both balances and the committed-transfer count stay visible.
- **GridFlex:** follow a scenario from interface to API contract, computation and result. Every stage explains a boundary and links to its source file.

Claims and banking are **browser-only teaching models**, not connections to the deployed APIs. They use fixed sample data and require no accounts or credentials. The banking model illustrates outcomes; it does not simulate database concurrency, row locks or distributed failures. CUDA values are recorded benchmarks, not measurements of the visitor’s device. GridFlex is a guided architecture view.

The models follow the published Claims controller/service rules and Neobank transaction service. Sources are linked in the interface. In particular, the Claims model does not invent additional status-transition restrictions: the published service validates the status name and role, records changed values, and treats a repeated status as a no-op.

## Navigation and accessibility

- Filter selected work by product, systems or performance.
- Open quick navigation with **⌘K / Ctrl+K** or Explore. Search, use arrow keys, press Enter to navigate or Escape to close.
- Use Left/Right/Home/End on the experiment tabs. Native modal dialogs contain focus; Escape and explicit close buttons return focus to the opener.
- Expand engineering decisions and compare recorded GridFlex benchmark horizons.
- Reduced-motion preferences disable smooth scrolling and transitions.

HTML supplies all project content and ordinary navigation. Without JavaScript, experiment controls are hidden and a direct link to the projects replaces the playground. The interface uses no framework, build step, account system, analytics or tracking service. Fonts use Google Fonts with local fallbacks.

## Preview and checks

```sh
python3 -m http.server 8787 --bind 127.0.0.1
```

Open `http://127.0.0.1:8787/` and `http://127.0.0.1:8787/work/gridflex.html`.

No npm dependencies are required. Use Node 20+ and Python 3.10+:

```sh
npm run check
npm test
```

GitHub Actions checks local links, anchors, assets, heading structure, JavaScript syntax and model invariants. Model tests cover authorization, audit no-ops, conservation of balances, idempotent replay, conflicting payloads, invalid amounts, failed commits and benchmark calculations.

Before publishing interface changes, also check:

1. All four experiments at 320, 390, 768 and 1440 pixels, including expanded dialogs.
2. Project filters, then a palette jump to a previously hidden project.
3. Palette search, empty results, arrow keys, Enter, Escape and focus restoration.
4. Tab keyboard navigation and dialog state preservation.
5. Project disclosures, case-study anchors and all three benchmark controls.
6. No browser errors; production pages and assets load successfully.

## Files

- `index.html`, `portfolio.css`, `portfolio.js`: home page, filtering and navigation.
- `playgrounds.js`, `playgrounds.css`: interactive workbench and expanded view.
- `playground-models.js`, `tests/`: pure teaching models, recorded data and invariant tests.
- `work/gridflex.html`, `styles.css`, `case.css`: case study and reading layout.
- `benchmark.js`: recorded GridFlex measurements.
- `assets/`: original GridFlex screenshot, recorded CUDA chart and favicon.
- `scripts/check_site.py`: dependency-free static-site validation.

Project claims link to source repositories. GridFlex figures come from the 0.2.0 benchmark record; update values and methodology together. CUDA figures state the hardware and workload. Neobank data is explicitly synthetic. The GridFlex screenshot is the original user-supplied image.

GitHub Pages publishes the repository root from `main`. `.nojekyll` keeps the site as static files.
