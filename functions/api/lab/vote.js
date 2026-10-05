// POST /api/lab/vote {page, choice, vid} → one anonymous vote per visitor per compared page (latest wins).
import { json, clean } from "../../_lib.js";
import { ensure } from "./_db.js";

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "not_configured" }, 503);
  let b;
  try { b = await request.json(); } catch { return json({ ok: false, error: "bad_json" }, 400); }
  const page = clean(b.page, 40), choice = clean(b.choice, 20), vid = clean(b.vid, 40);
  if (!/^[a-z]+\/\d{1,3}$/.test(page) || !/^[a-z0-9-]{2,20}$/.test(choice)) return json({ ok: false, error: "bad_input" }, 400);
  const who = /^[0-9a-f]{16,32}$/.test(vid) ? vid : "anon-" + crypto.randomUUID();
  await ensure(env.DB);
  await env.DB.prepare(
    `INSERT INTO lab_votes (page, vid, choice) VALUES (?,?,?)
     ON CONFLICT(page, vid) DO UPDATE SET choice = excluded.choice, at = strftime('%Y-%m-%dT%H:%M:%SZ','now')`
  ).bind(page, who, choice).run();
  return json({ ok: true });
}
