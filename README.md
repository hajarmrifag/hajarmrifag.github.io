# Hajar Mrifag — engineering portfolio

[Public portfolio](https://hajarmrifag.github.io/)

A static portfolio with selected projects and a detailed GridFlex engineering case study. HTML and CSS provide the full content and navigation; a small JavaScript module lets readers compare recorded benchmark horizons. No build step, account system or analytics service is required.

## Preview

```sh
python3 -m http.server 8787 --bind 127.0.0.1
```

Open `http://127.0.0.1:8787/` and `http://127.0.0.1:8787/work/gridflex.html`.

## Maintain

- `index.html`: introduction, selected projects and contact links.
- `work/gridflex.html`: case study, decisions, evidence and demo walkthrough.
- `styles.css`: responsive layout, keyboard focus, reduced motion and print styles.
- `benchmark.js`: recorded measurements, not a live benchmark.
- `assets/`: project screenshots, an existing CUDA chart and the favicon.

Project claims link to their source repositories. Benchmark values come from the GridFlex 0.2.0 record; update the values and methodology together. The CUDA figures state the hardware and workload. Neobank data is explicitly synthetic. The GridFlex screenshot is the original supplied image.

GitHub Pages publishes the repository root from `main`. `.nojekyll` keeps the site as static files. Both pages render meaningful content without JavaScript. Fonts use Google Fonts with local fallbacks; no analytics or tracking scripts are included.

Before publishing, check desktop and narrow-screen layouts, keyboard navigation, disclosure controls, benchmark selection, internal links and the not-found page.
