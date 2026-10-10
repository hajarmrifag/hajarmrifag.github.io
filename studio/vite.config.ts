import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Connect, PreviewServer, ViteDevServer } from "vite";
import { defineConfig } from "vite";

const studioDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(studioDir, "..");

const ROOT_FILES = new Set([
  "styles.css",
  "case.css",
  "motion.css",
  "motion.js",
  "cuda.js",
  "cuda-data.js",
  "benchmark.js",
  "404.html",
  "robots.txt",
  "sitemap.xml",
]);

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".pdf": "application/pdf",
  ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8",
};

function resolvePortfolioFile(urlPath: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  if (!decoded.startsWith("/") || decoded.includes("\0")) return null;
  if (decoded.split("/").includes("..")) return null;

  const relative = decoded.replace(/^\/+/, "");
  if (!relative || relative === "index.html") return null;

  const top = relative.split("/")[0];
  if (!top || (top !== "assets" && top !== "work" && !ROOT_FILES.has(relative))) return null;

  const full = path.resolve(repoRoot, relative);
  const rootWithSep = repoRoot.endsWith(path.sep) ? repoRoot : `${repoRoot}${path.sep}`;
  if (full !== repoRoot && !full.startsWith(rootWithSep)) return null;
  if (!fs.existsSync(full) || !fs.statSync(full).isFile()) return null;
  return full;
}

function servePortfolio(middlewares: Connect.Server) {
  middlewares.use((request, response, next) => {
    const urlPath = request.url?.split("?")[0] ?? "";
    const file = resolvePortfolioFile(urlPath);
    if (!file) {
      next();
      return;
    }
    response.statusCode = 200;
    response.setHeader("Content-Type", MIME[path.extname(file)] ?? "application/octet-stream");
    fs.createReadStream(file)
      .on("error", () => {
        if (!response.headersSent) next();
      })
      .pipe(response);
  });
}

function portfolioPlugin() {
  return {
    name: "serve-existing-portfolio",
    configureServer(server: ViteDevServer) {
      servePortfolio(server.middlewares);
    },
    configurePreviewServer(server: PreviewServer) {
      servePortfolio(server.middlewares);
    },
  };
}

export default defineConfig({
  plugins: [portfolioPlugin()],
  server: { host: "127.0.0.1", port: 5173 },
  preview: { host: "127.0.0.1", port: 4173 },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    assetsDir: "night-floor",
    chunkSizeWarningLimit: 600,
  },
});
