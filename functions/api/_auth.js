// Sign-in (Google) and synced progress. D1 binding DB; env GOOGLE_CLIENT_ID (public OAuth client id).
// Session = random token in an HttpOnly cookie; only its SHA-256 is stored.
import { sha256, newToken } from "../_lib.js";

let ready = false;
export async function ensure(db) {
  if (ready) return;
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, email TEXT NOT NULL DEFAULT '', name TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')), last_seen TEXT)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')))`),
    db.prepare(`CREATE TABLE IF NOT EXISTS progress (
      user_id TEXT PRIMARY KEY, data TEXT NOT NULL, updated_at TEXT NOT NULL)`),
  ]);
  ready = true;
}

const DAYS = 180;
export function cookie(token, maxAge) {
  return `sid=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export async function newSession(env, userId) {
  const token = newToken() + newToken();
  const exp = new Date(Date.now() + DAYS * 864e5).toISOString();
  await env.DB.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?,?,?)")
    .bind(await sha256(token), userId, exp).run();
  return { token, maxAge: DAYS * 86400 };
}

function sid(request) {
  const m = (request.headers.get("cookie") || "").match(/(?:^|;\s*)sid=([0-9a-f]{64})/);
  return m ? m[1] : null;
}

export async function currentUser(request, env) {
  const t = sid(request);
  if (!t || !env.DB) return null;
  await ensure(env.DB);
  return await env.DB.prepare(
    `SELECT u.id, u.email, u.name FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ? AND s.expires_at > strftime('%Y-%m-%dT%H:%M:%SZ','now')`
  ).bind(await sha256(t)).first();
}

export async function dropSession(request, env) {
  const t = sid(request);
  if (t && env.DB) await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(t)).run();
}

/* Google ID token (JWT, RS256) verification against Google's published keys. */
let certs = null, certsAt = 0;
function b64u(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(s + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
}
async function googleKeys() {
  if (certs && Date.now() - certsAt < 3600e3) return certs;
  const r = await fetch("https://www.googleapis.com/oauth2/v3/certs");
  certs = (await r.json()).keys || [];
  certsAt = Date.now();
  return certs;
}
export async function verifyGoogle(jwt, clientId) {
  const [h, p, s] = String(jwt || "").split(".");
  if (!s) return null;
  const head = JSON.parse(new TextDecoder().decode(b64u(h)));
  const jwk = (await googleKeys()).find((k) => k.kid === head.kid);
  if (!jwk || head.alg !== "RS256") return null;
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  if (!(await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64u(s), new TextEncoder().encode(`${h}.${p}`)))) return null;
  const c = JSON.parse(new TextDecoder().decode(b64u(p)));
  const now = Date.now() / 1000;
  if (c.aud !== clientId) return null;
  if (c.iss !== "accounts.google.com" && c.iss !== "https://accounts.google.com") return null;
  if (!(c.exp > now) || (c.iat && c.iat > now + 300)) return null;
  return c; // sub, email, email_verified, name
}
