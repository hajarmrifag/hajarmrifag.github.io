# Hajar Mrifag — engineering portfolio

[Visit the portfolio](https://hajarmrifag.github.io/)

A static software engineering portfolio: selected projects, engineering case studies, a downloadable CV, and direct contact details. Descriptions keep the original scope, decisions, measurements, and limits. Nothing here is a live benchmark of the visitor’s machine.

## Pages

- Home: positioning, then an interactive index ordered by the latest GitHub update. Sourced leads, then Aegis Claims, GridFlex, Neobank, CUDA kernels, and SkyQuery.
- Case studies under `work/` hold the longer engineering notes.
- Sourced is the Hong Kong AI Summit: BUILD ACROSS hackathon project (Startup Track, 3–4 October 2026). Screenshots are captured from a local run of [opportunity-compass](https://github.com/hajarmrifag/opportunity-compass). Demo listings in those shots are fictional, as the product labels them.
- CUDA includes a matrix-size selector for recorded GEMM results, on a common scale with a cuBLAS baseline.
- SkyQuery remains the internship case study, with sources pinned to repository revision `d1892fa`.

CV, email, LinkedIn, and GitHub work without JavaScript. The mobile menu is a native `details` element. A reading-progress bar and section navigator are progressive enhancements and turn off when reduced motion is requested.

There is no framework, build step, account system, or analytics. Fonts load from Google Fonts and fall back to local serif and sans faces.

## Preview and checks

```sh
python3 -m http.server 8787 --bind 127.0.0.1
```

No npm dependencies are required. With Node 20+ and Python 3.10+:

```sh
npm run check
npm test
```

GitHub Actions validates local links, anchors, assets, heading structure, JavaScript syntax, and benchmark calculations. Before publishing interface changes, inspect the home page and a case study at 320, 390, 768, and 1440 pixels, test both benchmark controls, check keyboard navigation, and verify the CV download.

## Files

- `index.html`, `styles.css`: home page and shared visual system.
- `work/*.html`, `case.css`: case studies.
- `cuda.js`, `cuda-data.js`, `tests/`: recorded GEMM comparison.
- `benchmark.js`: recorded GridFlex engine timings.
- `motion.js`, `motion.css`: progress, section navigation, and reduced motion.
- `assets/`: GridFlex screenshot, Sourced captures, CUDA chart, CV, and favicon.
- `scripts/check_site.py`: dependency-free static-site validation.

GridFlex figures come from the 0.2.0 benchmark record and measure two engine operations, not whole-app latency. CUDA figures specify hardware, workload, and methodology. The CV is the existing one-page PDF. GitHub Pages publishes the repository root from `main`. `.nojekyll` keeps the site as static files.
