// GET /api/lab/votes?page=bechorot/17 → {counts: {opus: n, fable: n, same: n}}
import { json } from "../../_lib.js";
import { ensure } from "./_db.js";

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ ok: true, counts: {} });
  const page = new URL(request.url).searchParams.get("page") || "";
  if (!/^[a-z]+\/\d{1,3}$/.test(page)) return json({ ok: false, error: "bad_page" }, 400);
  await ensure(env.DB);
  const { results } = await env.DB.prepare("SELECT choice, COUNT(*) AS n FROM lab_votes WHERE page = ? GROUP BY choice").bind(page).all();
  return json({ ok: true, counts: Object.fromEntries(results.map((r) => [r.choice, r.n])) });
}
