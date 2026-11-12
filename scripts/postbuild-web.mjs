import fs from "node:fs";
import path from "node:path";

const distDir = path.resolve("dist");
const indexHtml = path.join(distDir, "index.html");

if (fs.existsSync(indexHtml)) {
  // Copy index.html to 404.html for SPA fallback on static hosts.
  // Cloudflare Workers assets with "not_found_handling": "single-page-application"
  // automatically serves /index.html for all routes without creating extensionless files
  // or nested directories that cause 301 slash redirects or octet-stream downloads.
  fs.copyFileSync(indexHtml, path.join(distDir, "404.html"));
  console.log("✔ Generated 404.html SPA fallback");
}


