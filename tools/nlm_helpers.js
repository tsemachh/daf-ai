// Paste into the NotebookLM notebook tab (Claude in Chrome javascript_tool) once per page load.
// Then for each daf paste the line printed by `python3 tools/slides_prompt.py <slug> <daf> --js`, i.e.
//   await makeDeck(['Arakhin 5a |','Arakhin 5b |','ערכין ה׳ ·'], 'ערכין ה׳', [<sugya rows>], true)
// Call ONE makeDeck per javascript_tool call (a batch in one call hits the 45s tool timeout).
// It opens Studio → מצגת, picks exactly those 3 sources, fills the prompt and presses "ליצירה" (false = fill only).
window.sleep = ms => new Promise(r => setTimeout(r, ms));
window.norm = s => (s || '').replace(/[‎‏‪-‮]/g, '').trim().replace(/^[a-z_]+\s+/, '').replace(/\s+/g, ' ');
window.btn = (root, re) => [...root.querySelectorAll('button,[role=button]')].find(b => re.test(norm(b.innerText || b.getAttribute('aria-label'))));
window.rowLabel = c => { let e = c; for (let i = 0; i < 8 && e; i++) { e = e.parentElement; const t = (e.innerText || '').trim(); if (t && t.length < 120) return t.split('\n').filter(Boolean).pop(); } return '' };
window.pickDlg = async function (want) {
  const ov = document.querySelector('.cdk-overlay-container'); const cbs = [...ov.querySelectorAll('input[type=checkbox]')];
  for (const c of cbs) { const l = rowLabel(c); if (/בחירת כל/.test(l)) continue; const w = want.some(x => l.startsWith(x));
    if (c.checked !== w) { c.click(); await sleep(40); } }
  return cbs.filter(c => c.checked).map(rowLabel);
};
window.setPrompt = function (txt) {
  const ta = document.querySelector('.cdk-overlay-container textarea');
  Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(ta, txt);
  ta.dispatchEvent(new Event('input', { bubbles: true })); ta.dispatchEvent(new Event('change', { bubbles: true })); return ta.value.length;
};
window.TAIL = `לכל סוגיה 1–2 שקפים. כותרת כל שקף: "סוגיה N: שם". בראש השקף ציטוט קצר מהגמרא, ומתחתיו הסבר בעברית פשוטה.
שמות החכמים בדיוק כמו בגמרא. שום דבר מחוץ לגמרא, רש״י והדף שלנו. בלי טבלאות עמוסות טקסט. שקף סיכום אחד בסוף.
תרשימים זורמים מימין לשמאל: מתחילים בימין, החצים מימין לשמאל, מספור השלבים מימין לשמאל.
איורים: תרשימים, חצים, אייקונים וטקסט. לעולם לא דמויות לא לבושות או ציורי אנטומיה. אנשים רק בלבוש צנוע.
חכם מצויר רק כשהוא צד בסוגיה ושמו כתוב לידו — כרב: טלית או כיפה/מצנפת, זקן, לבוש של תלמיד חכם. בלי רבנים דקורטיביים.
רקע: קלף חלק ונקי. בלי מטבעות בכלל, בלי פסלים, בלי דיוקנאות ובלי דמויות רומיות או יווניות — גם לא ברקע.
סוגיות צניעות או איברי גוף: שורת טקסט עניינית אחת, בלי איור.
בדוק שכל דין משויך לחלק הנכון במשנה ולחכם הנכון, בדיוק כמו בדף שלנו.`;
window.mk = (title, rows) => `מצגת למלמד על ${title} — רק לפי שלושת המקורות שנבחרו (הגמרא בספריא, עמוד א ו־ב, ודף החזרה שלנו).
עקוב בדיוק אחרי רשימת הסוגיות של הדף שלנו, באותו סדר ובאותם שמות:
${rows.map((r, i) => 'סוגיה ' + (i + 1) + ': ' + r).join('\n')}
${TAIL}`;
window.makeDeck = async function (srcs, title, rows, go) {
  const tile = btn(document, /^מצגת$/); if (!tile) return 'no tile'; tile.click(); await sleep(1500);
  const ov = document.querySelector('.cdk-overlay-container');
  const sb = btn(ov, /^\d+ מקורות/); if (!sb) return 'no sources btn'; sb.click(); await sleep(1200);
  const picked = await pickDlg(srcs); await sleep(300);
  const ok = btn(ov, /^אישור$/); if (!ok) return 'no ok'; ok.click(); await sleep(1000);
  const n = setPrompt(mk(title, rows)); await sleep(300);
  let how = 'filled';   // out of quota → only "יצירה בהמשך": NotebookLM builds it later (hours); check studio() before re-running a daf
  if (go) { const g = btn(ov, /^ל?יצירה$/) || btn(ov, /^ל?יצירה בהמשך$/); if (!g) return 'no create'; how = norm(g.innerText); g.click(); await sleep(1500); }
  return { picked, n, how };
};
// Studio list / download helpers:
//   studio()                       → titles of decks in Studio (and "generating" rows)
//   rectOf(title)                  → scrolls that deck row into view, returns [x,y]; then click its ⋮ at (70,y) with the computer tool
//   pdfItem()                      → in the open ⋮ menu, clicks "הורדת מסמך PDF" (file lands in ~/Downloads)
window.studio = () => { const out = []; document.querySelectorAll('*').forEach(e => { if (e.children.length === 0) { const t = norm(e.textContent); if (/מקורות · |יוצרת את המצגת/.test(t)) out.push(norm(e.parentElement.parentElement.innerText).slice(0, 90)); } }); return [...new Set(out)] };
window.rectOf = t => { let leaf = null; document.querySelectorAll('*').forEach(e => { if (!leaf && e.children.length === 0 && norm(e.textContent) === t) leaf = e; }); if (!leaf) return null; leaf.scrollIntoView({ block: 'center' }); const r = leaf.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top + r.height / 2)] };
window.pdfItem = () => { const it = [...document.querySelectorAll('.cdk-overlay-container [role=menuitem]')].find(x => /PDF/.test(x.innerText)); if (it) { it.click(); return 'ok' } return 'none' };
'ok';
