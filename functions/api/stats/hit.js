// POST /api/stats/hit  body: {"v":"<16-32 hex>","p":"/path/"}  (sent with navigator.sendBeacon)
import { ensure, today } from "./_db.js";

const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|facebookexternalhit|whatsapp|telegram/i;

export async function onRequestPost({ request, env }) {
  const ok = new Response(null, { status: 204 });
  if (!env.DB) return ok;
  if (BOT.test(request.headers.get("user-agent") || "")) return ok;
  let b;
  try { b = JSON.parse(await request.text()); } catch { return ok; }
  const vid = String(b.v || "");
  if (!/^[0-9a-f]{16,32}$/.test(vid)) return ok;
  const path = String(b.p || "").slice(0, 60).replace(/[^a-z0-9/_-]/gi, "");
  const country = (request.cf && request.cf.country) || "";
  await ensure(env.DB);
  await env.DB.prepare(
    `INSERT INTO visits (day, vid, country, first_path) VALUES (?, ?, ?, ?)
     ON CONFLICT(day, vid) DO UPDATE SET views = views + 1`
  ).bind(today(), vid, country, path).run();
  return ok;
}

export function onRequest() {
  return new Response(null, { status: 405 });
}
