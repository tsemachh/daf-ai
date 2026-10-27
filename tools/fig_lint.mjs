// Lint our own drawings (content/figs/*.svg) as rendered, in light and dark:
//  - every label inside the viewBox (nothing cut off at the edge on a phone)
//  - labels don't overlap each other
//  - label text has enough contrast with the page background (≥ 3:1)
// usage: NODE_PATH=/opt/node-tools/node_modules node tools/fig_lint.mjs [name ...]   (exit 1 on a problem)
import fs from 'fs'; import path from 'path'; import {createRequire} from 'module';
const require = createRequire(import.meta.url); const {chromium} = require('playwright');
const ROOT = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const dir = path.join(ROOT, 'content', 'figs');
const names = process.argv.slice(2).length ? process.argv.slice(2) : fs.readdirSync(dir).filter(f => f.endsWith('.svg')).map(f => f.slice(0, -4));
const css = fs.readFileSync(path.join(ROOT, 'site', 'app.css'), 'utf8');
const b = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? {executablePath: '/opt/pw-browsers/chromium'} : {});
let bad = 0;
for (const scheme of ['light', 'dark']) {
  const c = await b.newContext({viewport: {width: 390, height: 900}, colorScheme: scheme});
  const p = await c.newPage();
  for (const n of names) {
    const svg = fs.readFileSync(path.join(dir, n + '.svg'), 'utf8');
    await p.setContent(`<!doctype html><html dir="rtl" lang="he"><head><meta charset="utf-8"><style>${css}</style></head><body><figure class="fig">${svg}</figure></body></html>`);
    const probs = await p.evaluate(() => {
      const out = [], s = document.querySelector('.fig svg'), vb = s.viewBox.baseVal;
      const lum = c => { const m = c.match(/[\d.]+/g).map(Number).slice(0, 3).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * m[0] + .7152 * m[1] + .0722 * m[2]; };
      let bg = getComputedStyle(document.body).backgroundColor; if (/rgba\(0, 0, 0, 0\)/.test(bg)) bg = 'rgb(255,255,255)';
      const T = [...s.querySelectorAll('text')].map(t => ({t, b: t.getBBox(), s: t.textContent}));
      for (const x of T) {
        if (x.b.x < vb.x - 1 || x.b.y < vb.y - 1 || x.b.x + x.b.width > vb.x + vb.width + 1 || x.b.y + x.b.height > vb.y + vb.height + 1)
          out.push(`cut off at the edge: ״${x.s}״`);
        const L1 = lum(getComputedStyle(x.t).fill), L2 = lum(bg), cr = (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05);
        if (cr < 3 && !x.t.closest('[data-on-img]')) out.push(`low contrast ${cr.toFixed(1)}:1: ״${x.s}״`);
      }
      for (let i = 0; i < T.length; i++) for (let j = i + 1; j < T.length; j++) {
        const a = T[i].b, c = T[j].b;
        if (a.x < c.x + c.width - 1 && c.x < a.x + a.width - 1 && a.y < c.y + c.height - 1 && c.y < a.y + a.height - 1)
          out.push(`labels overlap: ״${T[i].s}״ / ״${T[j].s}״`);
      }
      return out;
    });
    for (const m of probs) { console.log(`${n} [${scheme}]: ${m}`); bad++; }
  }
  await c.close();
}
await b.close();
console.log(bad ? `fig_lint: ${bad} problem(s)` : `fig_lint: ${names.length} figure(s) OK`);
process.exit(bad ? 1 : 0);
