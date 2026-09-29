// Guards /admin/* . Cloudflare Access sits in front of /admin*; this re-verifies the Access JWT so
// the page stays closed on preview URLs or if the Access app is ever removed.
// Required env: ACCESS_TEAM (e.g. "myteam.cloudflareaccess.com"), ACCESS_AUD (the Access app's AUD tag).
// Works for people (email) and for Access service tokens (common_name) used by the nightly job.
let certs = null, certsAt = 0;

function b64u(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(s + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
}

async function keys(team) {
  if (certs && Date.now() - certsAt < 3600e3) return certs;
  const r = await fetch(`https://${team}/cdn-cgi/access/certs`);
  certs = (await r.json()).keys || [];
  certsAt = Date.now();
  return certs;
}

async function verify(jwt, env) {
  const [h, p, s] = (jwt || "").split(".");
  if (!s) return null;
  const head = JSON.parse(new TextDecoder().decode(b64u(h)));
  const jwk = (await keys(env.ACCESS_TEAM)).find((k) => k.kid === head.kid);
  if (!jwk) return null;
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64u(s), new TextEncoder().encode(`${h}.${p}`));
  if (!ok) return null;
  const c = JSON.parse(new TextDecoder().decode(b64u(p)));
  const aud = Array.isArray(c.aud) ? c.aud : [c.aud];
  if (!aud.includes(env.ACCESS_AUD) || c.exp * 1000 < Date.now()) return null;
  return c.email || c.common_name || "service";
}

export async function onRequest(ctx) {
  const { request, env } = ctx;
  if (!env.ACCESS_TEAM || !env.ACCESS_AUD) return new Response("admin not configured", { status: 503 });
  const jwt = request.headers.get("cf-access-jwt-assertion") ||
    (request.headers.get("cookie") || "").match(/CF_Authorization=([^;]+)/)?.[1];
  let who = null;
  try { who = await verify(jwt, env); } catch { who = null; }
  if (!who) return new Response("forbidden", { status: 403 });
  ctx.data.user = who;
  return ctx.next();
}
