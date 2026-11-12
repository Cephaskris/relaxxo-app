import fs from "node:fs";
import path from "node:path";

const distDir = path.resolve("dist");
const indexHtml = path.join(distDir, "index.html");

// Remove any stale _redirects file (Cloudflare Workers Assets uses wrangler.jsonc instead)
fs.rmSync(path.join(distDir, "_redirects"), { force: true });

if (fs.existsSync(indexHtml)) {
  // Copy index.html to 404.html for SPA fallback on static hosts.
  // Cloudflare Workers Assets uses wrangler.jsonc ("not_found_handling": "single-page-application")
  // to serve /index.html with Content-Type: text/html on every route reload.
  fs.copyFileSync(indexHtml, path.join(distDir, "404.html"));
  console.log("✔ Generated 404.html SPA fallback");
}




