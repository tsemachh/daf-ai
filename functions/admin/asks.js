// GET /admin/asks — the questions learners asked (protected by _middleware.js + Cloudflare Access).
const PAGE = String.raw`<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>שאלות לומדים · ניהול</title>
<style>:root{--ink:#1d1b16;--paper:#faf7f0;--line:#ddd5c4;--muted:#6b6457;--accent:#8a4b1f;color-scheme:light dark}
@media (prefers-color-scheme:dark){:root{--ink:#ece6d8;--paper:#191814;--line:#3a362d;--muted:#a59d8c;--accent:#e0a36a}}
body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.6 system-ui,Arial,sans-serif}main{max-width:900px;margin:0 auto;padding:16px}
h1{font-size:22px;margin:4px 0 6px}.days{color:var(--muted);font-size:14px;margin-bottom:12px}
.it{border:1px solid var(--line);border-radius:12px;padding:10px 14px;margin:0 0 10px}.h{font-size:13px;color:var(--muted)}
.q{font-weight:700;margin:6px 0}.a{white-space:pre-wrap}a{color:var(--accent)}</style></head><body><main>
<h1>שאלות לומדים — ״שאל על הסוגיה״</h1><p><a href="/admin/">← הערות קוראים</a></p><div class="days" id="d"></div><div id="l">טוען…</div>
<script>fetch('/admin/api/asks?limit=200').then(r=>r.json()).then(j=>{
 document.getElementById('d').textContent=(j.days||[]).map(x=>x.day+': '+x.n+' שאלות ('+Math.round((x.i||0)/1000)+'K/'+Math.round((x.o||0)/1000)+'K טוקנים)').join(' · ');
 const l=document.getElementById('l'); l.textContent=''; if(!j.asks.length){l.textContent='עדיין אין שאלות.';return}
 j.asks.forEach(x=>{const d=document.createElement('div');d.className='it';
  const h=document.createElement('div');h.className='h';const a=document.createElement('a');a.href='/'+x.page+'/#'+x.page.replace('/','')+'-'+x.section;a.target='_blank';a.textContent=x.page+' · '+x.section;
  h.append(a,' · '+x.created_at.replace('T',' ').slice(0,16));const q=document.createElement('div');q.className='q';q.textContent=x.q;
  const an=document.createElement('div');an.className='a';an.textContent=x.a;
  const hb=document.createElement('button');let hid=!!x.hidden;const lab=()=>{hb.textContent=hid?'מוסתר — הצג שוב':'הסתר מהלומדים';d.style.opacity=hid?.5:1};lab();
  hb.onclick=()=>fetch('/admin/api/ask-hide',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id:x.id,hidden:!hid})}).then(()=>{hid=!hid;lab()});
  d.append(h,q,an,hb);l.append(d);});});</script></main></body></html>`;
export function onRequestGet() { return new Response(PAGE, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } }); }
