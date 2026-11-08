# Hajar Mrifag — engineering portfolio

[Visit the portfolio](https://hajarmrifag.github.io/)

A software engineering portfolio with a Three.js Night Floor homepage, static engineering case studies, a downloadable CV, and direct contact details. Descriptions keep the original scope, decisions, measurements, and limits. Nothing here is a live benchmark of the visitor’s machine.

## Pages

- Home: positioning, then a recruiter-first interactive index. SkyQuery leads, followed by GridFlex, Neobank, Aegis Claims, CUDA kernels, and Sourced.
- Case studies under `work/` hold the longer engineering notes.
- Sourced is the Hong Kong AI Summit: BUILD ACROSS hackathon project (Startup Track, 3–4 October 2026). Screenshots are captured from a local run of [opportunity-compass](https://github.com/hajarmrifag/opportunity-compass). Demo listings in those shots are fictional, as the product labels them.
- CUDA includes a matrix-size selector for recorded GEMM results, on a common scale with a cuBLAS baseline.
- SkyQuery remains the internship case study, with sources pinned to repository revision `d1892fa`.

CV, email, LinkedIn, GitHub, and the case-study links remain available without WebGL. The Night Floor scene respects reduced motion, and the case-study reading progress turns off when reduced motion is requested.

Night Floor uses vanilla Three.js, TypeScript, and Vite. The case studies remain dependency-free static pages. There is no portfolio account system or analytics. Fonts load from Google Fonts and fall back to local faces.

## Preview and checks

With Node 20+ and Python 3.10+, install the locked Night Floor dependencies, build Vite, and assemble the complete site:

```sh
npm ci --prefix studio
npm run build:site
npm run test:artifact
```

The self-contained output is written to the ignored root `dist/` directory. It combines the built homepage and `/night-floor/` assets with tracked case studies, `/assets/`, CV, favicon, supporting CSS/JavaScript, sitemap, robots file, 404 page, and `.nojekyll`. The assembly fails on filename collisions, missing references, unexpected output files, or untracked static inputs.

Serve that final artifact independently of Vite's development middleware:

```sh
npm run serve:artifact
```

Then open `http://127.0.0.1:8787/`. For Night Floor development without assembling an artifact:

```sh
npm --prefix studio run dev
```

Run the source checks and automated tests separately:

```sh
npm run check
npm test
```

GitHub Actions builds and smoke-tests the complete artifact, then validates source links, anchors, assets, heading structure, JavaScript syntax, and benchmark calculations. It does not deploy the artifact. Before publishing interface changes, inspect the home page and a case study at 320, 390, 768, and 1440 pixels, test both benchmark controls, check keyboard navigation, and verify the CV download.

## Files

- `studio/`: Night Floor source, Vite configuration, and custom GLB scene assets.
- `dist/`: generated, ignored complete-site artifact.
- `work/*.html`, `case.css`: case studies.
- `cuda.js`, `cuda-data.js`, `tests/`: recorded GEMM comparison.
- `benchmark.js`: recorded GridFlex engine timings.
- `motion.js`, `motion.css`: progress, section navigation, and reduced motion.
- `assets/`: GridFlex screenshot, Sourced captures, CUDA chart, CV, and favicon.
- `scripts/assemble_site.py`: tracked-file assembly and final-artifact validation.
- `scripts/smoke_site_artifact.mjs`: independent static HTTP smoke test.
- `scripts/check_site.py`: source-site validation.

GridFlex figures come from the 0.2.0 benchmark record and measure two engine operations, not whole-app latency. CUDA figures specify hardware, workload, and methodology. The CV is the existing one-page PDF. GitHub Pages currently publishes the repository root from `main`; building this artifact does not change Pages settings or deploy anything. `.nojekyll` is included in the assembled output.
