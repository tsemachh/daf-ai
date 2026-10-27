// List every glossary term as the reader sees it marked on a built page, with the sentence around it,
// so a reviewer can check that the definition fits the sense in context (audit 2026-10-27: ״קבלה״ = receiving the
// blood, not a business deal; ״קורא״ the verb; ״רבי חנניא״ inside ״רבי יהושע בן חנניא״…).
// usage: (serve dist on :PORT) NODE_PATH=/opt/node-tools/node_modules node tools/gloss_contexts.mjs PORT bechorot/39 [more pages…]
import {createRequire} from 'module'; const require=createRequire(import.meta.url); const {chromium}=require('playwright');
import fs from 'fs';
const [port,...pages]=process.argv.slice(2);
const G=JSON.parse(fs.readFileSync(new URL('../data/glossary.json',import.meta.url)));
const b=await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium')?{executablePath:'/opt/pw-browsers/chromium'}:{});
const p=await (await b.newContext({serviceWorkers:'block'})).newPage();
for (const u of pages){
  await p.goto(`http://localhost:${port}/${u}/`,{waitUntil:'load'}); await p.waitForTimeout(200);
  const r=await p.evaluate(()=>[...document.querySelectorAll('article.daf button.term')].map(t=>{
    const blk=t.closest('li,p,h3,td,summary')||t.parentElement, tx=blk.textContent.replace(/\s+/g,' '), w=t.closest('.tw')||t;
    let i=0, n=blk; const all=tx; const pos=all.indexOf(w.textContent); return {k:t.dataset.k, sec:(t.closest('section.sugya')||{}).id||'', ctx:all.slice(Math.max(0,pos-70),pos+w.textContent.length+70)};}));
  console.log(`# ${u}`);
  for (const x of r) console.log(`${x.k} (${(G[x.k]||{}).t}) [${x.sec.split('-').pop()}] …${x.ctx}…\n   = ${((G[x.k]||{}).d||'').slice(0,160)}`);
}
await b.close();
