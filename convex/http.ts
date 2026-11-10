import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { auth } from "./auth";

const http = httpRouter();

// Convex Auth endpoints (sign-in, token refresh).
auth.addHttpRoutes(http);

async function hmacSha512Hex(secret: string, body: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Paystack webhook. Set this URL in Paystack: https://<your-deployment>.convex.site/paystack/webhook
http.route({
  path: "/paystack/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) return new Response("not configured", { status: 500 });
    const body = await request.text();
    const signature = request.headers.get("x-paystack-signature") ?? "";
    const expected = await hmacSha512Hex(secret, body);
    if (!timingSafeEqual(signature, expected)) {
      return new Response("invalid signature", { status: 401 });
    }
    let event: { event?: string; data?: { reference?: string } };
    try {
      event = JSON.parse(body);
    } catch {
      return new Response("bad json", { status: 400 });
    }
    const reference = event.data?.reference;
    if (event.event === "charge.success" && reference) {
      // Re-verify with Paystack's API before crediting (defence in depth).
      await ctx.runAction(internal.payments.verifyWithPaystack, { reference });
    }
    return new Response("ok", { status: 200 });
  }),
});

export default http;
