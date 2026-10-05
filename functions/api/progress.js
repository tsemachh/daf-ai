// GET /api/progress → this user's saved progress; PUT /api/progress {data} → save it (the client merges first).
import { json } from "../_lib.js";
import { currentUser } from "./_auth.js";

const MAX = 300_000;

export async function onRequestGet({ request, env }) {
  const u = await currentUser(request, env);
  if (!u) return json({ ok: false, error: "signed_out" }, 401);
  const r = await env.DB.prepare("SELECT data, updated_at FROM progress WHERE user_id = ?").bind(u.id).first();
  return json({ ok: true, data: r ? JSON.parse(r.data) : null, updated_at: r ? r.updated_at : null });
}

export async function onRequestPut({ request, env }) {
  if (!(request.headers.get("content-type") || "").includes("application/json")) return json({ ok: false, error: "bad_type" }, 415);
  const u = await currentUser(request, env);
  if (!u) return json({ ok: false, error: "signed_out" }, 401);
  const raw = await request.text();
  if (raw.length > MAX) return json({ ok: false, error: "too_big" }, 413);
  let b;
  try { b = JSON.parse(raw); } catch { return json({ ok: false, error: "bad_json" }, 400); }
  if (!b || !b.data || b.data.v !== 1 || typeof b.data.pages !== "object") return json({ ok: false, error: "bad_data" }, 400);
  await env.DB.prepare(
    `INSERT INTO progress (user_id, data, updated_at) VALUES (?,?,strftime('%Y-%m-%dT%H:%M:%SZ','now'))
     ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`
  ).bind(u.id, JSON.stringify(b.data)).run();
  return json({ ok: true });
}
