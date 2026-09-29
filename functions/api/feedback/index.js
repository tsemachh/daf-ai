// POST /api/feedback — store a reader note in D1 (binding DB).
// Optional env: TURNSTILE_SECRET (secret) → Turnstile verification; IP_SALT (secret) for rate-limit hashing.
import { KINDS, json, clean, sha256, newToken, PAGE_RE } from "../../_lib.js";

const MAX_PER_HOUR = 6;

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "not_configured" }, 503);
  let b;
  try { b = await request.json(); } catch { return json({ ok: false, error: "bad_json" }, 400); }
  if (b.website) return json({ ok: true, id: 0, token: "" }); // honeypot

  const kind = KINDS[b.kind] ? b.kind : "fix";
  const text = clean(b.text, 2000);
  const page = clean(b.page, 40).replace(/^\/|\/$/g, "");
  const section = clean(b.section, 40).replace(/[^a-z0-9_-]/gi, "");
  const sectionTitle = clean(b.sectionTitle, 160);
  const name = clean(b.name, 80);
  let email = clean(b.email, 160).toLowerCase();
  const notify = b.notify && email ? 1 : 0;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return json({ ok: false, error: "bad_email" }, 400);
  if (!notify) email = "";
  if (text.length < 5) return json({ ok: false, error: "too_short" }, 400);
  if (!PAGE_RE.test(page)) return json({ ok: false, error: "bad_page" }, 400);

  const ip = request.headers.get("cf-connecting-ip") || "";
  if (env.TURNSTILE_SECRET) {
    const form = new FormData();
    form.append("secret", env.TURNSTILE_SECRET);
    form.append("response", clean(b.turnstile, 4096));
    if (ip) form.append("remoteip", ip);
    const v = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form })
      .then((r) => r.json()).catch(() => ({ success: false }));
    if (!v.success) return json({ ok: false, error: "captcha" }, 403);
  }

  const ipHash = ip ? await sha256((env.IP_SALT || "daf-ai") + ip) : "";
  if (ipHash) {
    const { n } = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM feedback WHERE ip_hash = ? AND created_at > strftime('%Y-%m-%dT%H:%M:%SZ','now','-1 hour')"
    ).bind(ipHash).first();
    if (n >= MAX_PER_HOUR) return json({ ok: false, error: "rate" }, 429);
  }

  const token = newToken();
  const r = await env.DB.prepare(
    `INSERT INTO feedback (token, page, section, section_title, kind, text, name, email, notify, ip_hash)
     VALUES (?,?,?,?,?,?,?,?,?,?) RETURNING id`
  ).bind(token, page, section, sectionTitle, kind, text, name, email, notify, ipHash).first();
  return json({ ok: true, id: r.id, token });
}

export function onRequest() {
  return json({ ok: false, error: "method" }, 405);
}
