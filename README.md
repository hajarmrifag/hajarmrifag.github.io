# Hajar Mrifag — engineering portfolio

[Visit the portfolio](https://hajarmrifag.github.io/)

A focused software engineering portfolio: four selected projects, engineering case studies, a downloadable CV and direct contact details. Project descriptions explain scope, technical decisions, evidence and deployment limits.

## Content and navigation

- GridFlex leads with the actual application screenshot and a detailed case study.
- Aegis Claims links to its deployed application, source and security assessment.
- CUDA includes a matrix-size selector for recorded GEMM benchmarks, with a common scale and a cuBLAS baseline. These are T4 measurements, not benchmarks of the visitor's device.
- Neobank links directly to database-backed tests and labels its data as synthetic.
- SkyQuery has a dedicated internship case study with employer/dates, individual and teammate responsibilities, implementation links, recorded results and explicit limitations. Sources are pinned to a repository revision.
- CV, email, LinkedIn and GitHub links are accessible without JavaScript.

Scroll reveals, a reading-progress bar and a floating section navigator connect the home page and case studies. Project images drift subtly while scrolling; selected cards have a pointer-following light on desktop. The reading navigator includes pause/resume controls. Motion is disabled when reduced motion is requested, including changes to that setting while the page is open. Content stays visible without JavaScript.

Ordinary anchors provide navigation. All project content and default benchmark values are static HTML; JavaScript progressively enables the CUDA selector. The GridFlex case study also compares recorded engine timings by horizon. Reduced-motion preferences are respected. There is no framework, build step, account system or analytics. Fonts use Google Fonts with local fallbacks.

## Preview and checks

```sh
python3 -m http.server 8787 --bind 127.0.0.1
```

No npm dependencies are required. With Node 20+ and Python 3.10+:

```sh
npm run check
npm test
```

GitHub Actions validates local links, anchors, assets, heading structure, JavaScript syntax and benchmark calculations. Before publishing interface changes, also inspect the home page and case study at 320, 390, 768 and 1440 pixels, test both benchmark controls, check keyboard navigation and verify the CV download.

## Files

- `index.html`, `portfolio.css`: home page and responsive layout.
- `cuda.js`, `cuda-data.js`, `tests/`: benchmark selector, recorded results and calculation checks.
- `work/gridflex.html`, `work/skyquery.html`, `styles.css`, `case.css`: case study and reading layout.
- `benchmark.js`: recorded GridFlex measurements.
- `motion.js`, `motion.css`: progressive scroll motion and accessible section navigation.
- `assets/`: original GridFlex screenshot, CV, recorded CUDA chart and favicon.
- `scripts/check_site.py`: dependency-free static-site validation.

GridFlex figures come from the 0.2.0 benchmark record and measure two engine operations, not whole-app latency. CUDA figures specify hardware, workload and methodology. Update values and context together. The CV contains project and education facts, internship experience from Hajar’s existing CVs, and an explicitly supplied contact email. The GridFlex screenshot is the original user-supplied image.

GitHub Pages publishes the repository root from `main`. `.nojekyll` keeps the site as static files.
