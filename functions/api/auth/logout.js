// POST /api/auth/logout → ends this browser's session.
import { json } from "../../_lib.js";
import { dropSession, cookie } from "../_auth.js";

export async function onRequestPost({ request, env }) {
  await dropSession(request, env);
  const r = json({ ok: true });
  r.headers.append("set-cookie", cookie("", 0));
  return r;
}
