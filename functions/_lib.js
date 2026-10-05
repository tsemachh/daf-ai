export const KINDS = { fix: "תיקון בתוכן", missing: "חסר בדף", feature: "הצעה לשיפור" };
export const STATUSES = ["new", "in-progress", "fixed", "feature", "rejected", "needs-info"];

export function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

export function clean(s, n) {
  return String(s ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, n);
}

export async function sha256(s) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

export function newToken() {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return [...a].map((x) => x.toString(16).padStart(2, "0")).join("");
}

export const PAGE_RE = /^[a-z]+\/\d{1,3}$/;

// Columns added after launch; added lazily so no manual migration is needed.
let colsOk = false;
export async function ensureCols(env) {
  if (colsOk || !env.DB) return;
  try { await env.DB.prepare("ALTER TABLE feedback ADD COLUMN public INTEGER NOT NULL DEFAULT 0").run(); } catch { /* exists */ }
  colsOk = true;
}
