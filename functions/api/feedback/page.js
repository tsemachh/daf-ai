// GET /api/feedback/page?p=bechorot/9 → public list of handled notes for a page (no names/emails/text).
import { json, PAGE_RE } from "../../_lib.js";

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ ok: true, notes: [] });
  const p = (new URL(request.url).searchParams.get("p") || "").replace(/^\/|\/$/g, "");
  if (!PAGE_RE.test(p)) return json({ ok: false, error: "bad_page" }, 400);
  const { results } = await env.DB.prepare(
    "SELECT id, section, kind, reply, updated_at FROM feedback WHERE page = ? AND status = 'fixed' AND commit_sha != '' ORDER BY updated_at DESC LIMIT 50"
  ).bind(p).all();
  return new Response(JSON.stringify({ ok: true, notes: results }), {
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=300" },
  });
}
