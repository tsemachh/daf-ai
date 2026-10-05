// GET /api/feedback/public → every handled note, anonymous: page, sugya, kind, status, reply and date.
// The note's own text is included only when its author ticked "public". Never names or emails.
import { json, ensureCols } from "../../_lib.js";

export async function onRequestGet({ env }) {
  if (!env.DB) return json({ ok: true, notes: [], counts: {} });
  await ensureCols(env);
  const { results } = await env.DB.prepare(
    `SELECT id, page, section, section_title, kind, status, reply, updated_at,
            CASE WHEN public = 1 THEN text ELSE '' END AS text
       FROM feedback WHERE status IN ('fixed','feature','rejected') ORDER BY updated_at DESC LIMIT 300`
  ).all();
  const c = await env.DB.prepare("SELECT status, COUNT(*) AS n FROM feedback GROUP BY status").all();
  return new Response(JSON.stringify({ ok: true, notes: results, counts: Object.fromEntries(c.results.map((r) => [r.status, r.n])) }), {
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=120" },
  });
}
