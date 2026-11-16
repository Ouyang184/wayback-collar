import { mkdir, readFile, writeFile } from "node:fs/promises";

const workerImport = "import { siteResponse } from './content.mjs';";
const worker = await readFile("worker/index.mjs", "utf8");
if (!worker.includes(workerImport)) throw new Error("Site response import is missing.");

const files = [
  ["/", "index.html", "text/html; charset=utf-8"],
  ["/styles.css", "styles.css", "text/css; charset=utf-8"],
  ["/waitlist.js", "waitlist.js", "text/javascript; charset=utf-8"],
  ["/favicon.svg", "favicon.svg", "image/svg+xml"],
  ["/trailtag-concept.jpg", "trailtag-concept.jpg", "image/jpeg"],
];
const assets = Object.fromEntries(await Promise.all(files.map(async ([route, file, mime]) => {
  const bytes = await readFile("public/" + file);
  const binary = mime === "image/jpeg";
  return [route, { mime, binary, body: bytes.toString(binary ? "base64" : "utf8") }];
})));

const site = `
const siteAssets = new Map(Object.entries(${JSON.stringify(assets)}));
let heroBytes;

function siteResponse(request) {
  const asset = siteAssets.get(new URL(request.url).pathname);
  if (!asset) return new Response("Page not found.", { status: 404 });
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method not allowed.", { status: 405, headers: { Allow: "GET, HEAD" } });
  }
  let body = null;
  if (request.method === "GET") {
    if (asset.binary) {
      heroBytes ??= Uint8Array.from(atob(asset.body), (character) => character.charCodeAt(0));
      body = heroBytes;
    } else {
      body = asset.body;
    }
  }
  return new Response(body, { headers: {
    "Content-Type": asset.mime,
    "Cache-Control": asset.mime.startsWith("text/html") ? "no-cache" : "public, max-age=300",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Content-Security-Policy": "default-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; base-uri 'none'; form-action 'self'",
  }});
}
`;

await mkdir("dist/server", { recursive: true });
await writeFile("dist/server/index.js", worker.replace(workerImport, () => site));
