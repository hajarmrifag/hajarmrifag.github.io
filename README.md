# Hajar Mrifag — engineering portfolio

[Visit the portfolio](https://hajarmrifag.github.io/)

A software engineering portfolio designed as an interactive engineering notebook: warm paper, charcoal, orange accents, large editorial typography and project-specific illustrations. Four selected projects connect the interface to the engineering underneath, alongside case studies, a downloadable CV and direct contact details.

## Content and navigation

- GridFlex leads with the actual application screenshot and a detailed case study.
- The hero's three selectable layers explain GridFlex's React interface, FastAPI boundaries and numerical engine. The endpoint, request-body limit and concurrency limit are checked against `gridflex-ai/api/main.py`.
- Aegis Claims includes a local interactive permission sketch. Adjusters cannot change status; Managers and Admins can. This reflects the controller's authorization rule and the service's audit-history behavior, not a live request. It links to the implementation, deployed application and security assessment.
- CUDA includes a matrix-size selector for recorded GEMM benchmarks, with a common scale and a cuBLAS baseline. These are T4 measurements, not benchmarks of the visitor's device.
- Neobank links directly to database-backed tests and labels its data as synthetic.
- SkyQuery has a dedicated internship case study with employer/dates, individual and teammate responsibilities, implementation links, recorded results and explicit limitations. Sources are pinned to a repository revision.
- CV, email, LinkedIn and GitHub links are accessible without JavaScript.

The homepage uses a four-project overview, ordinary anchor navigation and an expandable GPU benchmark. It has no floating reading controls or scroll animations. Case studies retain their reading-progress bar and section navigator, including pause/resume controls and reduced-motion support. Content stays visible without JavaScript.

Ordinary anchors provide navigation. All project content and default benchmark values are static HTML; JavaScript progressively enables the CUDA selector. The GridFlex case study also compares recorded engine timings by horizon. Reduced-motion preferences are respected. There is no framework, build step, account system or analytics. Fonts use Google Fonts with local fallbacks.

Layer buttons and the role selector start disabled until their enhancement loads. Email remains a working link whether or not clipboard access is available; the optional copy button handles clipboard rejection. Interactions use native controls and live announcements. Animations are short, user-triggered state transitions rather than continuous effects.

GridFlex screenshots use responsive 640, 960 and 1600px WebP derivatives; the original PNG is retained. The homepage image is lazy loaded. Font stylesheets are discovered from HTML rather than CSS imports. Homepage sharing metadata uses the actual GridFlex screenshot.

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

- `index.html`, `portfolio.css`, `portfolio.js`: home page, responsive layout, engineering-layer explorer, permission sketch and email copy control.
- `cuda.js`, `cuda-data.js`, `tests/`: benchmark selector, recorded results and calculation checks.
- `work/gridflex.html`, `work/skyquery.html`, `styles.css`, `case.css`: case study and reading layout.
- `benchmark.js`: recorded GridFlex measurements.
- `motion.js`, `motion.css`: progressive scroll motion and accessible section navigation.
- `assets/`: original GridFlex screenshot, CV, recorded CUDA chart and favicon.
- `scripts/check_site.py`: dependency-free static-site validation.

GridFlex figures come from the 0.2.0 benchmark record and measure two engine operations, not whole-app latency. CUDA figures specify hardware, workload and methodology. Update values and context together. The CV contains project and education facts, internship experience from Hajar’s existing CVs, and an explicitly supplied contact email. The GridFlex screenshot is the original user-supplied image.

GitHub Pages publishes the repository root from `main`. `.nojekyll` keeps the site as static files.
