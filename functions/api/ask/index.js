// "שאל על הסוגיה" — a learner's question about one sugya, answered by Claude from that sugya's own material only
// (its Gemara text, the page's steps and summaries). Env: ANTHROPIC_API_KEY (secret, required),
// ASK_MODEL (optional, default below), ASK_DAILY_CAP (all users, per day), ASK_USER_CAP (per IP hash, per day).
// D1 (binding DB) keeps an anonymous log: the question, the answer and token counts — to see what learners ask.
import { json, clean, sha256 } from "../../_lib.js";

const MODEL = "claude-haiku-5-5";
const PAGE = /^[a-z]+\/\d{1,3}$/;
let ready = false;
export async function ensure(db) {
  if (ready) return;
  await db.prepare(`CREATE TABLE IF NOT EXISTS asks (
      id INTEGER PRIMARY KEY AUTOINCREMENT, day TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
      ip_hash TEXT NOT NULL DEFAULT '', page TEXT NOT NULL, section TEXT NOT NULL DEFAULT '', q TEXT NOT NULL, a TEXT NOT NULL DEFAULT '',
      in_tok INTEGER NOT NULL DEFAULT 0, out_tok INTEGER NOT NULL DEFAULT 0)`).run();
  try { await db.prepare("ALTER TABLE asks ADD COLUMN hidden INTEGER NOT NULL DEFAULT 0").run(); } catch { /* exists */ }
  ready = true;
}
const day = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" });
const strip = (s) => String(s ?? "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

// GET /api/ask → {enabled}; GET /api/ask?page=bechorot/32 → also {counts: {s2: 3, …}} of shared questions per sugya;
// GET /api/ask?page=…&section=s2 → {items: [{q, a, at}]} — questions are shared with all learners (anonymous; the owner can hide any).
export async function onRequestGet({ request, env }) {
  const u = new URL(request.url), page = u.searchParams.get("page") || "", section = (u.searchParams.get("section") || "").replace(/[^a-z0-9_-]/gi, "");
  const out = { enabled: !!(env.ANTHROPIC_API_KEY && env.DB) };
  if (env.DB && PAGE.test(page)) {
    await ensure(env.DB);
    if (section) {
      const { results } = await env.DB.prepare("SELECT q, a, created_at AS at FROM asks WHERE page = ? AND section = ? AND hidden = 0 ORDER BY id DESC LIMIT 50").bind(page, section).all();
      out.items = results;
    } else {
      const { results } = await env.DB.prepare("SELECT section, COUNT(*) AS n FROM asks WHERE page = ? AND hidden = 0 GROUP BY section").bind(page).all();
      out.counts = Object.fromEntries(results.map((r) => [r.section, r.n]));
    }
  }
  return new Response(JSON.stringify(out), { headers: { "content-type": "application/json; charset=utf-8", "cache-control": page ? "public, max-age=60" : "public, max-age=300" } });
}

function context(d, sid) {
  const sec = (d.sections || []).find((s) => s.id === sid);
  if (!sec) return null;
  const L = [];
  L.push(`דף: ${d.title}. ${strip(d.thesis)}`);
  L.push(`סוגיה: ${strip(sec.title)}`);
  if (sec.unlock) L.push(`מפתח לסוגיה: ${strip(typeof sec.unlock === "string" ? sec.unlock : JSON.stringify(sec.unlock))}`);
  if (sec.flow) L.push(`בקצרה: ${strip(sec.flow)}`);
  const src = (d.srctext || {})[sec.ref];
  if (src && src.p) L.push(`לשון הגמרא (${src.t || sec.ref}):\n${src.p.map(strip).join("\n")}`);
  if (sec.stages) L.push("שלבי הסוגיה:\n" + sec.stages.map((s, i) => `${i + 1}. ${s.q} — ${s.a}`).join("\n"));
  L.push("מהלך הסוגיה, שלב אחר שלב:\n" + (sec.steps || []).map((st, i) =>
    `${i + 1}. [${strip(st.tag)}${st.p != null ? ` · על ${st.p + 1}` : ""}] ${strip(st.body)}`).join("\n"));
  if (sec.post) L.push(`עזרים: ${strip(sec.post).slice(0, 1500)}`);
  return { text: L.join("\n\n"), title: strip(sec.title), stages: sec.stages || [] };
}

const SYSTEM = `אתה עוזר לימוד באתר ״דף צמח״ לחזרה על הדף היומי. לומד שואל שאלה על סוגיה אחת.
ענה בעברית פשוטה וברורה, קצר (עד 120 מילים, פסקה אחת או שתיים), בלי כותרות ובלי סימוני Markdown.
הסתמך רק על החומר של הסוגיה שמצורף (לשון הגמרא, מהלך הסוגיה והסיכומים). כשאתה מצטט את הגמרא — בתוך ״…״.
אם התשובה אינה בחומר, אמור זאת בכנות והצע לעיין בגמרא, בשטיינזלץ או ברש״י — אל תמציא מקורות, שמות או דעות.
אל תפסוק הלכה למעשה: אם נשאלת שאלה הלכתית מעשית, הסבר מה אומרת הסוגיה והוסף ״להלכה למעשה — יש לשאול רב״.
אם השאלה אינה קשורה ללימוד הסוגיה, השב בנימוס שאתה עונה רק על הסוגיה.`;

export async function onRequestPost({ request, env }) {
  if (!env.ANTHROPIC_API_KEY || !env.DB) return json({ ok: false, error: "disabled" }, 503);
  let b; try { b = await request.json(); } catch { return json({ ok: false, error: "bad_json" }, 400); }
  const page = clean(b.page, 40).replace(/^\/|\/$/g, ""), section = clean(b.section, 20).replace(/[^a-z0-9_-]/gi, "");
  const q = clean(b.q, 500), stage = Number.isInteger(b.stage) ? b.stage : null;
  if (!PAGE.test(page) || !section) return json({ ok: false, error: "bad_page" }, 400);
  if (q.length < 3) return json({ ok: false, error: "too_short" }, 400);
  await ensure(env.DB);
  const d0 = day(), ip = request.headers.get("cf-connecting-ip") || "";
  const ipHash = ip ? await sha256((env.IP_SALT || "daf-ai") + ip) : "";
  const cap = +(env.ASK_DAILY_CAP || 400), ucap = +(env.ASK_USER_CAP || 25);
  const { n } = await env.DB.prepare("SELECT COUNT(*) AS n FROM asks WHERE day = ?").bind(d0).first();
  if (n >= cap) return json({ ok: false, error: "cap" }, 429);
  if (ipHash) {
    const r = await env.DB.prepare("SELECT COUNT(*) AS n FROM asks WHERE day = ? AND ip_hash = ?").bind(d0, ipHash).first();
    if (r.n >= ucap) return json({ ok: false, error: "user_cap" }, 429);
  }
  const res = await env.ASSETS.fetch(new URL(`/feed/v1/${page}.json`, request.url));
  if (!res.ok) return json({ ok: false, error: "no_page" }, 404);
  const ctx = context(await res.json(), section);
  if (!ctx) return json({ ok: false, error: "no_section" }, 404);
  // up to 3 earlier turns of this conversation (follow-up questions)
  const hist = (Array.isArray(b.history) ? b.history : []).slice(-3).flatMap((t) =>
    t && t.q && t.a ? [{ role: "user", content: clean(t.q, 500) }, { role: "assistant", content: clean(t.a, 1500) }] : []);
  const messages = [{ role: "user", content: `החומר של הסוגיה:\n<sugya>\n${ctx.text}\n</sugya>\n\nאענה רק מתוך החומר הזה.` },
    { role: "assistant", content: "קראתי את החומר של הסוגיה. מה השאלה?" }, ...hist,
    { role: "user", content: stage != null && ctx.stages[stage] ? `(השאלה על שלב ${stage + 1} בסוגיה: ${ctx.stages[stage].q})\n${q}` : q }];
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: env.ASK_MODEL || MODEL, max_tokens: 600, system: SYSTEM, messages }),
  }).catch(() => null);
  if (!r || !r.ok) return json({ ok: false, error: "upstream", status: r ? r.status : 0 }, 502);
  const j = await r.json();
  const a = (j.content || []).filter((c) => c.type === "text").map((c) => c.text).join("\n").trim();
  if (!a) return json({ ok: false, error: "empty" }, 502);
  await env.DB.prepare("INSERT INTO asks (day, ip_hash, page, section, q, a, in_tok, out_tok) VALUES (?,?,?,?,?,?,?,?)")
    .bind(d0, ipHash, page, section, q, a, j.usage?.input_tokens || 0, j.usage?.output_tokens || 0).run();
  return json({ ok: true, a });
}

export function onRequest() { return json({ ok: false, error: "method" }, 405); }
