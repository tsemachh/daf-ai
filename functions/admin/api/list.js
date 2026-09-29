// GET /admin/api/list?status=new&page=bechorot/9&limit=100 → notes (full rows except ip_hash/token)
import { json, STATUSES, PAGE_RE } from "../../_lib.js";

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "not_configured" }, 503);
  const q = new URL(request.url).searchParams;
  const where = [], args = [];
  const st = q.get("status");
  if (st && st !== "all") {
    const list = st.split(",").filter((s) => STATUSES.includes(s));
    if (list.length) { where.push(`status IN (${list.map(() => "?").join(",")})`); args.push(...list); }
  }
  const p = q.get("page");
  if (p && PAGE_RE.test(p)) { where.push("page = ?"); args.push(p); }
  const limit = Math.min(Number(q.get("limit")) || 100, 500);
  const sql = `SELECT id, page, section, section_title, kind, text, name, email, notify, status, reply, commit_sha,
    notified_at, created_at, updated_at FROM feedback ${where.length ? "WHERE " + where.join(" AND ") : ""}
    ORDER BY id ${st === "new" ? "ASC" : "DESC"} LIMIT ${limit}`;
  const { results } = await env.DB.prepare(sql).bind(...args).all();
  const counts = await env.DB.prepare("SELECT status, COUNT(*) AS n FROM feedback GROUP BY status").all();
  return json({ ok: true, notes: results, counts: Object.fromEntries(counts.results.map((r) => [r.status, r.n])) });
}
