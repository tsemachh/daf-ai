// POST /api/auth/google {credential} → verifies the Google ID token, creates the user + a session cookie.
import { json, clean } from "../../_lib.js";
import { ensure, verifyGoogle, newSession, cookie } from "../_auth.js";

export async function onRequestPost({ request, env }) {
  if (!env.DB || !env.GOOGLE_CLIENT_ID) return json({ ok: false, error: "not_configured" }, 503);
  let b;
  try { b = await request.json(); } catch { return json({ ok: false, error: "bad_json" }, 400); }
  const c = await verifyGoogle(b.credential, env.GOOGLE_CLIENT_ID).catch(() => null);
  if (!c || !c.sub) return json({ ok: false, error: "bad_token" }, 401);
  await ensure(env.DB);
  const id = "g:" + c.sub;
  const email = c.email_verified ? clean(c.email, 160) : "";
  const name = clean(c.given_name || c.name || "", 80);
  await env.DB.prepare(
    `INSERT INTO users (id, email, name, last_seen) VALUES (?,?,?,strftime('%Y-%m-%dT%H:%M:%SZ','now'))
     ON CONFLICT(id) DO UPDATE SET email = excluded.email, name = excluded.name, last_seen = excluded.last_seen`
  ).bind(id, email, name).run();
  const s = await newSession(env, id);
  const r = json({ ok: true, user: { name, email } });
  r.headers.append("set-cookie", cookie(s.token, s.maxAge));
  return r;
}
