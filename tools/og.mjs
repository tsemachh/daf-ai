// Social preview images (og:image, 1200×630) → site/og/<slug>-<daf>.png and site/og/site.png.
// usage: node tools/og.mjs                 # site image + every daf that has no image yet
//        node tools/og.mjs bechorot 18      # (re)build one daf
// Needs Playwright with Chromium (npm i playwright; PLAYWRIGHT_BROWSERS_PATH is preset in the cloud).
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
let pw;
for (const p of ["playwright", "/home/claude/.npm-global/lib/node_modules/playwright"]) {
  try { pw = require(p); break; } catch { /* next */ }
}
if (!pw) { console.error("playwright not found (npm i playwright)"); process.exit(1); }

const font = (f) => `url(file://${ROOT}/site/fonts/${f})`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const strip = (s) => String(s || "").replace(/<[^>]+>/g, "");
const clip = (s, n) => (s.length > n ? s.slice(0, s.lastIndexOf(" ", n)) + "…" : s);

function html({ eyebrow, title, sub, tags }) {
  return `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><style>
@font-face{font-family:F;src:${font("frank-hebrew.woff2")};font-weight:400 900}
@font-face{font-family:A;src:${font("assistant-hebrew.woff2")};font-weight:400 800}
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;background:#F3F4EF;color:#1C2230;font-family:A,sans-serif;display:flex}
.side{width:28px;background:#2B4C7E}
.main{flex:1;padding:64px 72px 52px;display:flex;flex-direction:column}
.eb{font-size:30px;font-weight:700;color:#7A5C14;letter-spacing:.5px}
h1{font-family:F,serif;font-weight:900;font-size:${title.length > 14 ? 96 : 120}px;line-height:1.05;margin-top:14px}
p{font-family:F,serif;font-size:38px;line-height:1.45;color:#2B4C7E;margin-top:22px;max-height:166px;overflow:hidden}
.foot{margin-top:auto;display:flex;justify-content:space-between;align-items:flex-end;gap:24px}
.tags{display:flex;gap:10px;flex-wrap:wrap}
.tags span{font-size:24px;font-weight:700;padding:6px 16px;border:2px solid #D8DAD1;border-radius:999px;color:#5B6272;background:#FBFBF8}
.brand{text-align:left;font-size:26px;font-weight:800;color:#1C2230;white-space:nowrap}
.brand small{display:block;font-size:22px;font-weight:600;color:#5B6272;direction:ltr}
</style></head><body><div class="main">
<div class="eb">${esc(eyebrow)}</div><h1>${esc(title)}</h1>${sub ? `<p>${esc(sub)}</p>` : ""}
<div class="foot"><div class="tags">${tags.map((t) => `<span>${esc(t)}</span>`).join("")}</div>
<div class="brand">דפי חזרה ולימוד<small>daf.tsemach.dev</small></div></div>
</div><div class="side"></div></body></html>`;
}

const TAGS = ["מהלך הסוגיה", "עץ טיעונים", "שאלות חזרה"];
const jobs = [];
const out = path.join(ROOT, "site", "og");
fs.mkdirSync(out, { recursive: true });
const [slug1, daf1] = process.argv.slice(2);
if (!slug1 && !fs.existsSync(path.join(out, "site.png")))
  jobs.push({ file: "site.png", eyebrow: "הדף היומי · נבנה מחדש בכל יום", title: "דפי חזרה ולימוד",
    sub: "מהלך הסוגיה שלב אחר שלב, עץ טיעונים, לשון הגמרא וביאור שטיינזלץ, ושאלות חזרה", tags: TAGS });
for (const dir of fs.readdirSync(path.join(ROOT, "data"))) {
  const d0 = path.join(ROOT, "data", dir);
  if (!fs.statSync(d0).isDirectory()) continue;
  for (const f of fs.readdirSync(d0).filter((x) => /^\d+\.json$/.test(x))) {
    const d = JSON.parse(fs.readFileSync(path.join(d0, f), "utf8"));
    const file = `${d.slug}-${d.daf}.png`;
    if (slug1 ? !(d.slug === slug1 && String(d.daf) === String(daf1)) : fs.existsSync(path.join(out, file))) continue;
    jobs.push({ file, eyebrow: strip(d.eyebrow).replace(/^הדף היומי · /, "") , title: d.title, sub: clip(strip(d.thesis), 120), tags: TAGS });
  }
}
if (!jobs.length) { console.log("og: nothing to do"); process.exit(0); }
const b = await pw.chromium.launch();
const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
for (const j of jobs) {
  await p.setContent(html(j), { waitUntil: "load" });
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: path.join(out, j.file), type: "png" });
  console.log("og:", j.file);
}
await b.close();
