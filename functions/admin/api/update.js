// POST /admin/api/update {id, status?, reply?, commit_sha?, notified?:true, clear_email?:true}
import { json, clean, STATUSES } from "../../_lib.js";

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "not_configured" }, 503);
  let b;
  try { b = await request.json(); } catch { return json({ ok: false, error: "bad_json" }, 400); }
  const id = Number(b.id);
  if (!Number.isInteger(id) || id < 1) return json({ ok: false, error: "bad_id" }, 400);
  const set = [], args = [];
  if (b.status !== undefined) {
    if (!STATUSES.includes(b.status)) return json({ ok: false, error: "bad_status" }, 400);
    set.push("status = ?"); args.push(b.status);
  }
  if (b.reply !== undefined) { set.push("reply = ?"); args.push(clean(b.reply, 2000)); }
  if (b.commit_sha !== undefined) { set.push("commit_sha = ?"); args.push(clean(b.commit_sha, 40).replace(/[^0-9a-f]/gi, "")); }
  if (b.notified) set.push("notified_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')");
  if (b.clear_email) set.push("email = '', notify = 0");
  if (!set.length) return json({ ok: false, error: "nothing_to_update" }, 400);
  set.push("updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')");
  const r = await env.DB.prepare(`UPDATE feedback SET ${set.join(", ")} WHERE id = ? RETURNING id, status, reply, commit_sha, updated_at`)
    .bind(...args, id).first();
  return r ? json({ ok: true, note: r }) : json({ ok: false, error: "not_found" }, 404);
}
