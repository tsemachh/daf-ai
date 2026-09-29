// GET /api/feedback/status?n=12.abcd…,13.ef01…  → status of the caller's own notes (id + token).
import { json } from "../../_lib.js";

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "not_configured" }, 503);
  const pairs = (new URL(request.url).searchParams.get("n") || "")
    .split(",").slice(0, 30)
    .map((p) => p.split("."))
    .filter(([id, t]) => /^\d+$/.test(id) && /^[0-9a-f]{32}$/.test(t || ""));
  const out = [];
  for (const [id, t] of pairs) {
    const r = await env.DB.prepare(
      "SELECT id, page, section, section_title, kind, text, status, reply, created_at, updated_at FROM feedback WHERE id = ? AND token = ?"
    ).bind(Number(id), t).first();
    if (r) out.push(r);
  }
  return json({ ok: true, notes: out });
}
