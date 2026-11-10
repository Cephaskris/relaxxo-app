import { ConvexError } from "convex/values";

// Turns "0803 123 4567" / "2348031234567" / "+2348031234567" into +2348031234567, or null if invalid.
export function normalizePhone(input: string): string | null {
  let d = input.replace(/[^\d+]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  if (d.startsWith("234")) d = d.slice(3);
  if (d.startsWith("0")) d = d.slice(1);
  if (!/^[789][01]\d{8}$/.test(d)) return null;
  return "+234" + d;
}

export function prettyPhone(e164: string) {
  const d = e164.replace("+234", "0");
  return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
}

export function naira(n: number) {
  return "₦" + Math.round(n).toLocaleString("en-NG");
}

export function errorMessage(e: unknown): string {
  if (e instanceof ConvexError) return typeof e.data === "string" ? e.data : "Something went wrong";
  if (e instanceof Error && e.message && e.message.length < 120 && !e.message.includes("[CONVEX")) {
    return e.message;
  }
  return "Something went wrong. Please try again.";
}

export function timeLeft(until: number) {
  const mins = Math.max(0, Math.round((until - Date.now()) / 60000));
  if (mins >= 60 * 24) return `${Math.floor(mins / 1440)}d ${Math.floor((mins % 1440) / 60)}h`;
  if (mins >= 60) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  return `${mins}m`;
}

export function minutesLabel(mins: number) {
  if (mins >= 60 * 24) return `${Math.floor(mins / 1440)} days`;
  if (mins >= 60) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  return `${mins}m`;
}

export function ago(ts: number) {
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  if (m < 1440) return `${Math.floor(m / 60)}h`;
  return `${Math.floor(m / 1440)}d`;
}

export function randomToken() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
