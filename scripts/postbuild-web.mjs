import fs from "node:fs";
import path from "node:path";

const distDir = path.resolve("dist");
const indexHtml = path.join(distDir, "index.html");

if (fs.existsSync(indexHtml)) {
  // 1. Copy index.html to 404.html for SPA fallback on static hosts
  fs.copyFileSync(indexHtml, path.join(distDir, "404.html"));

  // 2. Pre-create route entry points so direct navigation (/admin, /auth/sign-in, etc.) returns 200 OK
  const routes = [
    "admin",
    "admin/verification",
    "admin/users",
    "admin/transactions",
    "admin/moderation",
    "admin/refunds",
    "admin/notifications",
    "admin/settings",
    "auth/sign-in",
    "auth/role",
    "home",
    "home/stays",
    "home/messages",
    "home/wallet",
    "home/account",
    "onboarding/therapist",
    "onboarding/hotel",
    "pro",
    "pro/services",
    "pro/messages",
    "pro/wallet",
    "pro/account",
    "host",
    "host/rooms",
    "host/wallet",
    "host/account",
    "therapists",
    "landing",
  ];

  for (const route of routes) {
    const routeDir = path.join(distDir, route);
    fs.mkdirSync(routeDir, { recursive: true });
    fs.copyFileSync(indexHtml, path.join(routeDir, "index.html"));
  }
  console.log(`✔ Generated SPA route entry points (${routes.length} routes + 404.html)`);
}

