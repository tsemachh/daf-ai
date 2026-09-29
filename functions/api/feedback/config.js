// GET /api/feedback/config → public settings for the feedback form (Turnstile sitekey is public by design).
export function onRequestGet({ env }) {
  return new Response(JSON.stringify({ ok: !!env.DB, sitekey: env.TURNSTILE_SITEKEY || "" }), {
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=300" },
  });
}
