// Human review marks per daf page.
// GET  /api/reviewed?page=bechorot/46 → {ok, review:{by,at}|null}   (public)
// POST /api/reviewed {page, on}       → reviewer only (signed-in user whose email is in env.REVIEWERS)
import { json } from "../_lib.js";
import { currentUser } from "./_auth.js";

const PAGE = /^[a-z]+\/\d{1,3}$/;
let ready = false;
async function ensure(db) {
  if (ready) return;
  await db.prepare(`CREATE TABLE IF NOT EXISTS reviews (
    page TEXT PRIMARY KEY, by_name TEXT NOT NULL, by_email TEXT NOT NULL, at TEXT NOT NULL)`).run();
  ready = true;
}
export function isReviewer(u, env) {
  const list = String(env.REVIEWERS || "tsemachh@gmail.com").toLowerCase().split(/[,\s]+/).filter(Boolean);
  return !!(u && u.email && list.includes(String(u.email).toLowerCase()));
}

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ ok: true, review: null });
  const page = new URL(request.url).searchParams.get("page") || "";
  if (!PAGE.test(page)) return json({ ok: false, error: "bad_page" }, 400);
  await ensure(env.DB);
  const r = await env.DB.prepare("SELECT by_name, at FROM reviews WHERE page = ?").bind(page).first();
  return json({ ok: true, review: r ? { by: r.by_name, at: r.at } : null });
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "not_configured" }, 503);
  const u = await currentUser(request, env).catch(() => null);
  if (!isReviewer(u, env)) return json({ ok: false, error: "forbidden" }, 403);
  const b = await request.json().catch(() => ({}));
  const page = String(b.page || "");
  if (!PAGE.test(page)) return json({ ok: false, error: "bad_page" }, 400);
  await ensure(env.DB);
  if (b.on) {
    const at = new Date().toISOString().slice(0, 10);
    await env.DB.prepare(`INSERT INTO reviews (page, by_name, by_email, at) VALUES (?,?,?,?)
      ON CONFLICT(page) DO UPDATE SET by_name=excluded.by_name, by_email=excluded.by_email, at=excluded.at`)
      .bind(page, u.name || "", u.email, at).run();
    return json({ ok: true, review: { by: u.name || "", at } });
  }
  await env.DB.prepare("DELETE FROM reviews WHERE page = ?").bind(page).run();
  return json({ ok: true, review: null });
}
