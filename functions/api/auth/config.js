// GET /api/auth/config → public settings for the sign-in button.
export function onRequestGet({ env }) {
  return new Response(JSON.stringify({ google: env.GOOGLE_CLIENT_ID || "" }), {
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=300" },
  });
}
