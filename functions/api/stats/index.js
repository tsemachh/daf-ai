// GET /api/stats → public aggregate counts only (no ids, no paths per person).
import { json } from "../../_lib.js";
import { ensure, today } from "./_db.js";

export async function onRequestGet({ env }) {
  if (!env.DB) return json({ ok: false, error: "not_configured" }, 503);
  await ensure(env.DB);
  const from30 = today(29), from7 = today(6), t = today();
  const { results: days } = await env.DB.prepare(
    `SELECT day, COUNT(*) AS users, SUM(country = 'IL') AS users_il, SUM(views) AS views
     FROM visits WHERE day >= ? GROUP BY day ORDER BY day`
  ).bind(from30).all();
  const u7 = await env.DB.prepare(
    `SELECT COUNT(DISTINCT vid) AS n, COUNT(DISTINCT CASE WHEN country = 'IL' THEN vid END) AS il FROM visits WHERE day >= ?`
  ).bind(from7).first();
  const u30 = await env.DB.prepare(
    `SELECT COUNT(DISTINCT vid) AS n, COUNT(DISTINCT CASE WHEN country = 'IL' THEN vid END) AS il FROM visits WHERE day >= ?`
  ).bind(from30).first();
  const ret = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM (SELECT vid FROM visits WHERE day >= ? GROUP BY vid HAVING COUNT(*) > 1)`
  ).bind(from7).first();
  const res = json({ ok: true, today: t, days, week: u7, month: u30, returning7: ret.n });
  res.headers.set("cache-control", "public, max-age=120");
  return res;
}
