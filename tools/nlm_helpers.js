// Paste into the NotebookLM tab (Claude in Chrome javascript_tool) once per page load.
// pickDlg(['Arakhin 5a |','Arakhin 5b |','ערכין ה׳ ·'])  — inside the deck dialog's "מקורות" list: check exactly these
// setPrompt(text)                                       — fill "תיאור המצגת שרוצים ליצור" in the deck dialog
window.rowLabel = c => { let e = c; for (let i = 0; i < 8 && e; i++) { e = e.parentElement; const t = (e.innerText || '').trim(); if (t && t.length < 120) return t.split('\n').filter(Boolean).pop(); } return '' };
window.pickDlg = async function (want) {
  const ov = document.querySelector('.cdk-overlay-container'); const cbs = [...ov.querySelectorAll('input[type=checkbox]')];
  for (const c of cbs) { const l = rowLabel(c); if (/בחירת כל/.test(l)) continue; const w = want.some(x => l.startsWith(x));
    if (c.checked !== w) { c.click(); await new Promise(r => setTimeout(r, 40)); } }
  return cbs.filter(c => c.checked).map(rowLabel);
};
window.setPrompt = function (txt) {
  const ta = document.querySelector('.cdk-overlay-container textarea');
  Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(ta, txt);
  ta.dispatchEvent(new Event('input', { bubbles: true })); ta.dispatchEvent(new Event('change', { bubbles: true })); return ta.value.length;
};
'ok';
