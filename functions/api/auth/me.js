// GET /api/auth/me → {user} or {user:null}
import { json } from "../../_lib.js";
import { currentUser } from "../_auth.js";

export async function onRequestGet({ request, env }) {
  const u = await currentUser(request, env).catch(() => null);
  return json({ ok: true, user: u ? { name: u.name, email: u.email } : null });
}
