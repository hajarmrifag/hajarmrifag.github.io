import { createReadStream } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "dist");
const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".glb", "model/gltf-binary"],
  [".html", "text/html; charset=utf-8"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".pdf", "application/pdf"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".xml", "application/xml; charset=utf-8"],
]);

async function filesWithin(directory, prefix = "") {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) files.push(...await filesWithin(path.join(directory, entry.name), relative));
    else if (entry.isFile()) files.push(relative);
  }
  return files;
}

function resolveRequest(requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl, "http://127.0.0.1").pathname);
  const relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const candidate = path.resolve(root, relative);
  const rootPrefix = root.endsWith(path.sep) ? root : `${root}${path.sep}`;
  if (candidate !== root && !candidate.startsWith(rootPrefix)) return null;
  return candidate;
}

const server = createServer(async (request, response) => {
  let file = resolveRequest(request.url ?? "/");
  try {
    if (file && (await stat(file)).isDirectory()) file = path.join(file, "index.html");
    if (!file || !(await stat(file)).isFile()) throw new Error("not found");
    response.statusCode = 200;
  } catch {
    file = path.join(root, "404.html");
    response.statusCode = 404;
  }
  response.setHeader("Content-Type", contentTypes.get(path.extname(file)) ?? "application/octet-stream");
  createReadStream(file).pipe(response);
});

await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});

try {
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Static smoke server did not bind.");
  const origin = `http://127.0.0.1:${address.port}`;
  const files = await filesWithin(root);

  for (const relative of files) {
    const response = await fetch(`${origin}/${relative}`);
    if (!response.ok) throw new Error(`${relative}: HTTP ${response.status}`);
    const bytes = (await response.arrayBuffer()).byteLength;
    const expected = (await stat(path.join(root, relative))).size;
    if (bytes !== expected) throw new Error(`${relative}: served ${bytes} bytes, expected ${expected}`);
  }

  const routes = new Map([
    ["/", "Hajar Mrifag"],
    ["/work/skyquery.html", "SkyQuery"],
    ["/work/gridflex.html", "GridFlex"],
    ["/work/neobank.html", "Neobank"],
    ["/work/aegis.html", "Aegis Claims"],
    ["/work/cuda.html", "CUDA kernels"],
    ["/work/sourced.html", "Sourced"],
  ]);
  for (const [route, marker] of routes) {
    const response = await fetch(`${origin}${route}`);
    const body = await response.text();
    if (!response.ok || !body.includes(marker)) {
      throw new Error(`${route}: expected HTTP 200 containing ${JSON.stringify(marker)}`);
    }
  }

  const missing = await fetch(`${origin}/artifact-smoke-missing`);
  if (missing.status !== 404 || !(await missing.text()).includes("Page not found")) {
    throw new Error("Missing routes do not return the assembled 404 page.");
  }

  console.log(`Static HTTP smoke passed for ${files.length} files, ${routes.size} routes, and the 404 page.`);
} finally {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}
