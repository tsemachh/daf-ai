// GET /admin/ — reader-notes dashboard (protected by _middleware.js + Cloudflare Access).
const PAGE = String.raw`<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>הערות קוראים · ניהול</title>
<style>
:root{--ink:#1d1b16;--paper:#faf7f0;--line:#ddd5c4;--muted:#6b6457;--accent:#8a4b1f;--ok:#2f6b3a;--no:#9b2c2c;color-scheme:light dark}
@media (prefers-color-scheme:dark){:root{--ink:#ece6d8;--paper:#191814;--line:#3a362d;--muted:#a59d8c;--accent:#e0a36a;--ok:#8fcf99;--no:#f09a9a}}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.6 system-ui,"Segoe UI",Arial,sans-serif}
main{max-width:1000px;margin:0 auto;padding:16px}h1{font-size:22px;margin:4px 0 12px}
.bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:14px}
select,input,textarea,button{font:inherit;color:inherit;background:transparent;border:1px solid var(--line);border-radius:8px;padding:6px 10px}
button{cursor:pointer}button.pri{background:var(--accent);color:var(--paper);border-color:var(--accent)}
.note{border:1px solid var(--line);border-radius:12px;padding:12px 14px;margin:0 0 12px}
.h{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:14px;color:var(--muted)}.h b{color:var(--ink)}
.t{white-space:pre-wrap;margin:8px 0}.st{font-weight:700}.st.new{color:var(--no)}.st.fixed{color:var(--ok)}
.f{display:grid;grid-template-columns:auto 1fr;gap:6px 10px;align-items:center}.f textarea{width:100%;min-height:60px}
.f .row{grid-column:1/-1;display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.msg{font-size:14px;color:var(--muted)}a{color:var(--accent)}
</style></head><body><main>
<h1>הערות קוראים</h1>
<div class="bar"><label>סטטוס <select id="st">
<option value="new">חדשות</option><option value="needs-info">חסר מידע</option><option value="in-progress">בטיפול</option>
<option value="fixed">תוקנו</option><option value="feature">בקשות תכונה</option><option value="rejected">נדחו</option><option value="all">הכל</option>
</select></label><span id="counts" class="msg"></span><span class="msg" id="who"></span></div>
<div id="list"></div></main>
<script>
var L={new:'חדשה','in-progress':'בטיפול',fixed:'תוקנה',feature:'בקשת תכונה',rejected:'נדחתה','needs-info':'חסר מידע'};
var K={fix:'תיקון',missing:'חסר',feature:'הצעה'};
function el(t,a,c){var e=document.createElement(t);if(a)for(var k in a)e[k]=a[k];if(c!=null)e.append.apply(e,[].concat(c));return e}
function load(){
  var s=document.getElementById('st').value;
  fetch('/admin/api/list?status='+s).then(function(r){return r.json()}).then(function(j){
    var box=document.getElementById('list');box.innerHTML='';
    document.getElementById('counts').textContent=Object.keys(j.counts||{}).map(function(k){return (L[k]||k)+': '+j.counts[k]}).join(' · ');
    if(!j.notes||!j.notes.length){box.append(el('p',{className:'msg'},'אין הערות.'));return}
    j.notes.forEach(function(n){
      var link='/'+n.page+'/'+(n.section?'#'+n.page.split('/')[0]+n.page.split('/')[1]+'-'+n.section:'');
      var h=el('div',{className:'h'},[el('b',null,'#'+n.id),el('span',{className:'st '+n.status},L[n.status]||n.status),
        el('span',null,K[n.kind]||n.kind),el('a',{href:link,target:'_blank'},n.page+(n.section?' · '+(n.section_title||n.section):'')),
        el('span',null,n.created_at.replace('T',' ').slice(0,16)),n.name?el('span',null,n.name):'',
        n.notify&&n.email?el('span',null,'✉ '+n.email+(n.notified_at?' (עודכן)':'')):'']);
      var sel=el('select');Object.keys(L).forEach(function(k){sel.append(el('option',{value:k,selected:k===n.status},L[k]))});
      var rep=el('textarea',{value:n.reply||'',placeholder:'תשובה פומבית (עברית)'});
      var sha=el('input',{value:n.commit_sha||'',placeholder:'commit',size:10});
      var msg=el('span',{className:'msg'});
      var save=el('button',{className:'pri',type:'button'},'שמירה');
      save.onclick=function(){save.disabled=true;msg.textContent='…';
        fetch('/admin/api/update',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id:n.id,status:sel.value,reply:rep.value,commit_sha:sha.value})})
        .then(function(r){return r.json()}).then(function(r){save.disabled=false;msg.textContent=r.ok?'נשמר ✓':'שגיאה: '+r.error})
        .catch(function(){save.disabled=false;msg.textContent='שגיאת רשת'})};
      var f=el('div',{className:'f'},[el('label',null,'סטטוס'),sel,el('label',null,'תשובה'),rep,el('div',{className:'row'},[sha,save,msg])]);
      box.append(el('div',{className:'note'},[h,el('div',{className:'t'},n.text),f]));
    });
  }).catch(function(){document.getElementById('list').textContent='שגיאה בטעינה'});
}
document.getElementById('st').onchange=load;load();
</script></body></html>`;

export function onRequestGet({ data }) {
  return new Response(PAGE.replace('<span class="msg" id="who"></span>', `<span class="msg" id="who">${String(data.user).replace(/[<>&"]/g, "")}</span>`), {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" },
  });
}
