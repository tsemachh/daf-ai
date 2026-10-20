// POST /admin/api/ask-hide {id, hidden} — hide (or show again) a shared question.
import { json } from "../../_lib.js";
import { ensure } from "../../api/ask/index.js";
export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ ok: false }, 503);
  let b; try { b = await request.json(); } catch { return json({ ok: false, error: "bad_json" }, 400); }
  await ensure(env.DB);
  await env.DB.prepare("UPDATE asks SET hidden = ? WHERE id = ?").bind(b.hidden ? 1 : 0, Number(b.id) || 0).run();
  return json({ ok: true });
}
