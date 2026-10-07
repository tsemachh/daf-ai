// GET /api/feedback/recent → latest content fixes made after reader notes (public; no names/emails/text).
import { json } from "../../_lib.js";

export async function onRequestGet({ env }) {
  if (!env.DB) return json({ ok: true, notes: [] });
  const { results } = await env.DB.prepare(
    `SELECT id, page, section, section_title, reply, updated_at FROM feedback
     WHERE status = 'fixed' AND commit_sha != '' AND updated_at > strftime('%Y-%m-%dT%H:%M:%SZ','now','-30 days')
     ORDER BY updated_at DESC LIMIT 5`
  ).all();
  return new Response(JSON.stringify({ ok: true, notes: results }), {
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=300" },
  });
}
