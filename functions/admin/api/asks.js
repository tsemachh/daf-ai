// GET /admin/api/asks?limit=100 → recent "שאל על הסוגיה" questions and answers, with today's totals (no ip_hash).
import { json } from "../../_lib.js";
export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "not_configured" }, 503);
  const limit = Math.min(Number(new URL(request.url).searchParams.get("limit")) || 100, 500);
  try {
    const { results } = await env.DB.prepare(`SELECT id, created_at, page, section, q, a, in_tok, out_tok, hidden FROM asks ORDER BY id DESC LIMIT ${limit}`).all();
    const t = await env.DB.prepare("SELECT day, COUNT(*) AS n, SUM(in_tok) AS i, SUM(out_tok) AS o FROM asks GROUP BY day ORDER BY day DESC LIMIT 14").all();
    return json({ ok: true, asks: results, days: t.results });
  } catch (e) { return json({ ok: true, asks: [], days: [] }); }   // table not created yet
}
