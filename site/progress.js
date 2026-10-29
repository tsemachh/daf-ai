/* learner progress: sugya ✓, resume, streak, pace, export/import.
   Stored in this browser (localStorage key "dafProgress"); after Google sign-in it is also synced to
   /api/progress so it follows the learner between devices (merge = union, never loses progress). */
(function(){
  var KEY='dafProgress', C={pages:[],mas:{}};
  try{C=JSON.parse(document.getElementById('catalog').textContent)}catch(e){}
  if(!C.pages) return;
  function blank(){return {v:1,pages:{},days:[],review:[],later:{},pre:{},asked:{},pace:{mode:'yomi'},last:null,first:null}}
  function norm(s){if(!s||s.v!==1)return blank(); var b=blank(); for(var k in b) if(s[k]==null) s[k]=b[k]; return s}
  var S; try{S=norm(JSON.parse(localStorage.getItem(KEY)||'null'))}catch(e){S=blank()}
  function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){} if(SY.user) SY.push()}
  var SY={user:null,push:function(){}};
  window.dafUser=function(){return SY.user};   // the note form (app.js) pre-fills name + email when signed in

  /* ---------- helpers ---------- */
  function el(t,c,txt){var e=document.createElement(t);if(c)e.className=c;if(txt!=null)e.textContent=txt;return e}
  var TF=null, TC={t:0,v:''}; function today(){var n=Date.now(); if(n-TC.t<60000) return TC.v; try{TF=TF||new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jerusalem'}); TC.v=TF.format(new Date())}catch(e){TC.v=new Date().toISOString().slice(0,10)} TC.t=n; return TC.v}
  var RVN=8;   /* questions per daily review session */
  function addDays(iso,n){var d=new Date(iso+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}
  function dow(iso){return new Date(iso+'T12:00:00Z').getUTCDay()}
  function rest(iso){return dow(iso)===6}               /* Shabbat never breaks a streak or a plan */
  var L=C.pages.slice().sort(function(a,b){return a.y<b.y?-1:a.y>b.y?1:a.d-b.d});
  function byKey(k){for(var i=0;i<L.length;i++) if(L[i].k===k) return L[i]; return null}
  function entry(k){return S.pages[k]||(S.pages[k]={s:{}})}
  function nLearned(p){var e=S.pages[p.k]; if(!e) return 0; return p.n.filter(function(id){return e.s[id]==='learned'}).length}
  function laterIn(p){return p.n.filter(function(id){return S.later[p.k+'#'+id]})}
  function stateOf(p){var c=nLearned(p); if(p.n.length&&c===p.n.length&&!laterIn(p).length) return 'learned'; var e=S.pages[p.k]; return e&&Object.keys(e.s).length||laterIn(p).length?'progress':'new'}
  /* WhatsApp-style ticks: one grey = opened, two blue = learned (viewed long enough) */
  var TICK1='<path d="M1.5 6.2l3.3 3.3L11 2.8"/>', TICK2=TICK1+'<path d="M7.6 9.1l.4.4L14.4 2.8"/>';
  function ticks(st){ if(st!=='opened'&&st!=='learned'&&st!=='progress') return null;
    var sp=el('span','pg-tick '+(st==='learned'?'blue':'grey')); sp.setAttribute('aria-label',st==='learned'?'נלמד':'נפתח');
    sp.innerHTML='<svg viewBox="0 0 16 12" width="16" height="12" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+(st==='learned'?TICK2:TICK1)+'</svg>'; return sp; }
  var BOOK='<svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true"><path d="M6.5 3.5h11v17l-5.5-4-5.5 4z" fill="var(--bk-fill,none)" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>';
  function heb(n){ var o=''; [[400,'ת'],[300,'ש'],[200,'ר'],[100,'ק']].forEach(function(a){while(n>=a[0]){o+=a[1];n-=a[0]}});
    if(n===15||n===16) return o+'ט'+(n===15?'ו':'ז');
    [[90,'צ'],[80,'פ'],[70,'ע'],[60,'ס'],[50,'נ'],[40,'מ'],[30,'ל'],[20,'כ'],[10,'י']].forEach(function(a){if(n>=a[0]){o+=a[1];n-=a[0]}});
    return o+(n?'אבגדהוזחט'.charAt(n-1):''); }
  function url(p){return '/'+p.k+'/'}
  function touch(){if(!S.first) S.first=today()}
  function markDay(){var t=today(); if(S.days.indexOf(t)<0){S.days.push(t); S.days=S.days.slice(-500)}}
  function streak(){
    var t=today(), d=S.days.indexOf(t)>=0?t:addDays(t,-1), n=0, g=0;
    while(g++<500){ if(S.days.indexOf(d)>=0) n++; else if(!rest(d)) break; d=addDays(d,-1); }
    return n;
  }
  /* pages due by today under the chosen pace, and today's page */
  function plan(){
    var t=today();
    if(S.pace.mode==='plan'){
      var i0=0; L.forEach(function(p,i){if(p.k===S.pace.start) i0=i});
      var since=S.pace.since||t, per=+S.pace.per||1, k=0, d=since, g=0;
      while(d<=t&&g++<4000){ if(!rest(d)) k++; d=addDays(d,1); }
      var upto=i0+Math.ceil(k*per);                       /* exclusive */
      var due=L.slice(i0,Math.min(L.length,upto));
      return {due:due, today:k&&upto<=L.length?L[upto-1]:null, beyond:upto>L.length};
    }
    var from=S.first||t, tp=null;
    L.forEach(function(p){ if(p.y===t) tp=p; });
    return {due:L.filter(function(p){return p.y&&p.y<=t&&p.y>=from}), today:tp, beyond:!tp};
  }
  /* S.pre[slug]=n: the learner said dapim up to n were learned before they started using the site */
  function learnedP(p){return stateOf(p)==='learned'||p.d<=(S.pre[p.s]||0)}
  function dafState(slug,d,p){ if(d<=(S.pre[slug]||0)) return 'learned'; return p?stateOf(p):'na'; }
  function behind(){var pl=plan(); return pl.due.filter(function(p){return p!==pl.today&&!learnedP(p)})}  /* today's page is not 'behind' */

  /* ---------- settings panel (pace + backup) ---------- */
  function settings(){
    var box=el('div','pg-set');
    box.appendChild(el('div','prefs-h','קצב לימוד'));
    var r1=el('label'), c1=el('input'); c1.type='radio'; c1.name='pgpace'; c1.checked=S.pace.mode!=='plan';
    r1.append(c1,document.createTextNode(' לפי לוח הדף היומי'));
    var r2=el('label'), c2=el('input'); c2.type='radio'; c2.name='pgpace'; c2.checked=S.pace.mode==='plan';
    r2.append(c2,document.createTextNode(' קצב אישי'));
    var pl=el('div','pg-plan'); pl.hidden=!c2.checked;
    var sel=el('select'); L.forEach(function(p){var o=el('option',null,p.h); o.value=p.k; sel.appendChild(o)});
    sel.value=S.pace.start||(L[0]&&L[0].k)||'';
    var dt=el('input'); dt.type='date'; dt.value=S.pace.since||today();
    var per=el('select'); [['0.5','חצי דף ליום'],['1','דף ליום'],['2','שני דפים ליום']].forEach(function(o){var x=el('option',null,o[1]); x.value=o[0]; per.appendChild(x)});
    per.value=String(S.pace.per||1);
    function lab(t,inp){var l=el('label','pg-row'); l.append(el('span',null,t),inp); return l}
    pl.append(lab('מתחיל בדף',sel),lab('מתאריך',dt),lab('קצב',per),el('p','pg-hint','שבת אינה נספרת.'));
    function apply(){
      S.pace=c2.checked?{mode:'plan',start:sel.value,since:dt.value||today(),per:+per.value}:{mode:'yomi'};
      pl.hidden=!c2.checked; save(); refresh();
    }
    [c1,c2,sel,dt,per].forEach(function(x){x.addEventListener('change',apply)});
    box.append(r1,r2,pl);

    box.appendChild(el('div','prefs-h','התחברות וסנכרון בין מכשירים'));
    box.appendChild(syncBox());
    var bk=el('details','pg-manual'); bk.appendChild(el('summary',null,'גיבוי ידני בלי חשבון (קובץ או קוד)'));
    box.appendChild(bk); bkEls.push(bk); bk.hidden=!!SY.user;
    var row=el('div','pg-btns');
    var dl=el('button','btn','הורד קובץ'); dl.type='button';
    dl.onclick=function(){var b=new Blob([JSON.stringify(S)],{type:'application/json'}), a=el('a'); a.href=URL.createObjectURL(b); a.download='daf-progress-'+today()+'.json'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function(){URL.revokeObjectURL(a.href)},1000)};
    var cp=el('button','btn','העתק קוד'); cp.type='button';
    var ta=el('textarea','pg-code'); ta.rows=3; ta.placeholder='הדביקו כאן קוד מהמכשיר השני'; ta.setAttribute('aria-label','קוד התקדמות');
    cp.onclick=function(){var code=btoa(unescape(encodeURIComponent(JSON.stringify(S)))); ta.value=code; ta.select();
      if(navigator.clipboard) navigator.clipboard.writeText(code).then(function(){msg.textContent='הקוד הועתק ✓'},function(){msg.textContent='סמנו והעתיקו את הקוד'}); else msg.textContent='סמנו והעתיקו את הקוד';};
    var fl=el('label','btn pg-file','טען מקובץ'), fi=el('input'); fi.type='file'; fi.accept='application/json,.json'; fi.hidden=true; fl.appendChild(fi);
    fi.onchange=function(){var f=fi.files[0]; if(!f) return; f.text().then(importText)};
    var ip=el('button','btn','טען מקוד'); ip.type='button'; ip.onclick=function(){importText(ta.value.trim())};
    var msg=el('p','pg-hint','גיבוי ידני, בלי חשבון. טעינה ממזגת עם מה שכבר קיים כאן.');
    row.append(dl,cp,fl,ip); bk.append(row,ta,msg);
    function importText(t){
      var o=null; try{o=JSON.parse(t)}catch(e){try{o=JSON.parse(decodeURIComponent(escape(atob(t))))}catch(e2){}}
      if(!o||o.v!==1){msg.textContent='הקובץ או הקוד אינם תקינים'; return}
      merge(norm(o)); save(); refresh(); msg.textContent='ההתקדמות נטענה ✓';
    }
    return box;
  }
  function merge(o){
    var rank={opened:1,learned:2};
    Object.keys(o.pages).forEach(function(k){var a=entry(k), b=o.pages[k]||{s:{}};
      Object.keys(b.s||{}).forEach(function(id){ if((rank[b.s[id]]||0)>(rank[a.s[id]]||0)) a.s[id]=b.s[id]; });
      if(b.quiz&&(!a.quiz||b.quiz.best>a.quiz.best)) a.quiz=b.quiz; if(b.done&&!a.done) a.done=b.done;
    });
    o.days.forEach(function(d){if(S.days.indexOf(d)<0) S.days.push(d)}); S.days.sort();
    o.review.forEach(function(r){ if(!S.review.some(function(x){return x.page===r.page&&x.q===r.q})) S.review.push(r); });
    if(o.first&&(!S.first||o.first<S.first)) S.first=o.first;
    if(o.last&&(!S.last||o.last.ts>S.last.ts)) S.last=o.last;
    if(o.pace&&o.pace.mode==='plan'&&S.pace.mode!=='plan') S.pace=o.pace;
    Object.keys(o.later||{}).forEach(function(k){ if(!S.later[k]) S.later[k]=o.later[k]; });
    Object.keys(o.pre||{}).forEach(function(k){ S.pre[k]=Math.max(S.pre[k]||0,o.pre[k]); });
  }

  var painters=[]; function refresh(){painters.forEach(function(f){f()})}

  /* ---------- sign-in + sync ---------- */
  var syncEls=[], bkEls=[], pushT=null, gsi=null;
  function api(u,o){return fetch(u,Object.assign({credentials:'same-origin'},o||{})).then(function(r){return r.json().catch(function(){return {}})})}
  SY.push=function(){clearTimeout(pushT); pushT=setTimeout(function(){
    api('/api/progress',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({data:S})}).then(function(j){ if(j&&j.error==='signed_out'){SY.user=null;paintSync()} });
  },2500)};
  function pull(){ return api('/api/progress').then(function(j){
    if(j&&j.ok&&j.data&&j.data.v===1){ merge(norm(j.data)); try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){} refresh(); }
    if(j&&j.ok) SY.push();
    revSync();
  }); }
  /* reviewer: every daf the reviewer finished is marked ״נבדק על ידי אדם״ — and in a masechet, every daf from the first one
     they finished up to today (they learn the daf daily). Sent once per page; the server keeps the first date. */
  function revSync(){
    if(!(SY.user&&SY.user.reviewer)) return;
    var sent={}; try{sent=JSON.parse(localStorage.getItem('rv-sent')||'{}')}catch(e){}
    var t=today(), items=[], from=SY.user.reviewer_from||'', ch=false;
    L.forEach(function(p){ var e=S.pages[p.k], fin=e&&(e.done||stateOf(p)==='learned');
      var inRun=from&&p.y>=from&&p.y<=t;   /* the reviewer learns every daf from that date */
      if(inRun&&!fin){ e=entry(p.k); p.n.forEach(function(id){ e.s[id]='learned'; }); e.done=e.done||p.y; ch=true; fin=true; }
      if(fin&&!sent[p.k]) items.push({page:p.s+'/'+p.d,at:(e&&e.done)||p.y,k:p.k}); });
    if(ch){ touch(); save(); refresh(); }
    if(!items.length) return;
    fetch('/api/reviewed',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},
      body:JSON.stringify({items:items.map(function(x){return {page:x.page,at:x.at}}),on:true})})
      .then(function(r){return r.json()}).then(function(j){ if(j&&j.ok){ items.forEach(function(x){sent[x.k]=1});
        try{localStorage.setItem('rv-sent',JSON.stringify(sent))}catch(e){} if(window.__rvRefresh) window.__rvRefresh(); } }).catch(function(){});
  }
  SY.rev=revSync;
  function paintSync(){ syncEls=syncEls.filter(function(f){return f.w.isConnected}); syncEls.forEach(function(f){f()});
    bkEls=bkEls.filter(function(b){return b.isConnected}); bkEls.forEach(function(b){b.hidden=!!SY.user}) }
  function loadGsi(){ return gsi||(gsi=new Promise(function(res){
    if(window.google&&google.accounts) return res(true);
    var sc=document.createElement('script'); sc.src='https://accounts.google.com/gsi/client'; sc.async=true;
    sc.onload=function(){res(true)}; sc.onerror=function(){res(false)}; document.head.appendChild(sc);
  })) }
  var AC=null; function authCfg(){return AC||(AC=api('/api/auth/config'))}
  /* one GIS init for every button on the page (header chip + settings panel) */
  var GI=null;
  function gsiReady(){ return GI||(GI=authCfg().then(function(c){
    if(!c||!c.google) return 'nocfg';
    return loadGsi().then(function(ok){
      if(!ok) return 'noload';
      google.accounts.id.initialize({client_id:c.google, ux_mode:'popup', auto_select:false, callback:function(r){
        api('/api/auth/google',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({credential:r.credential})}).then(function(j){
          if(j&&j.ok){SY.user=j.user; paintSync(); pull()} else toast('הכניסה נכשלה. נסו שוב.');
        });
      }});
      return 'ok';
    });
  })) }
  function gButton(slot,size){
    gsiReady().then(function(st){
      if(st==='nocfg'){slot.append(el('p','pg-hint','הכניסה עדיין לא הוגדרה.')); return}
      if(st!=='ok'){slot.append(el('p','pg-hint','לא ניתן לטעון את כפתור Google כרגע.')); return}
      google.accounts.id.renderButton(slot,{theme:'outline',size:size||'large',shape:'pill',text:'signin_with',locale:'he',width:240});
    });
  }
  function logout(){ api('/api/auth/logout',{method:'POST'}).then(function(){SY.user=null; try{google.accounts.id.disableAutoSelect()}catch(e){} paintSync()}) }
  function syncBox(){
    var wrap=el('div','pg-sync');
    function paint(){
      wrap.innerHTML='';
      if(SY.user){
        wrap.append(el('p','pg-hint','מחובר'+(SY.user.name?' כ־'+SY.user.name:'')+(SY.user.email?' ('+SY.user.email+')':'')+'. ההתקדמות נשמרת גם בחשבון ומתעדכנת בכל מכשיר שבו תתחברו.'));
        var out=el('button','btn','התנתקות'); out.type='button'; out.onclick=logout;
        wrap.append(out); return;
      }
      wrap.append(el('p','pg-hint','התחברו כדי להמשיך מאותה נקודה בכל מכשיר — במחשב ובנייד. ההתקדמות שכבר יש בדפדפן הזה תצורף לחשבון.'));
      var pv=el('a','pg-hint','מה נשמר? מדיניות הפרטיות'); pv.href='/privacy/'; wrap.append(pv);
      var slot=el('div','pg-gbtn'); wrap.append(slot); gButton(slot);
    }
    paint.w=wrap; syncEls.push(paint); paint(); return wrap;
  }
  /* account chip, always visible at the top: "התחברות" or "שלום, <name>" with a small menu */
  (function(){
    var host=document.querySelector('.topnav'), app=document.getElementById('app')||document.querySelector('.wrap');
    if(!host&&!app) return;
    var box=el('div','acct'), btn=el('button','acct-btn'); btn.type='button'; btn.setAttribute('aria-haspopup','true'); btn.setAttribute('aria-expanded','false');
    var menu=el('div','acct-menu'); menu.hidden=true; box.append(btn,menu);
    if(host){ var g=el('span','topnav-end'); var b=host.querySelector('.ai-badge'); if(b) g.append(b); g.append(box); host.append(g); }
    else if(app.querySelector('.home-top')) app.querySelector('.home-top').append(box);   /* home: same line as the brand, on the left */
    else { var h1=app.querySelector('header h1'), th=h1&&h1.parentNode.querySelector('.thesis');
      if(th){ var row=el('div','acct-row'); th.before(row); row.append(th,box); }       /* same line as the subtitle, on the left */
      else { var bar=el('div','acct-bar'); bar.append(box); if(h1){ bar.classList.add('under-h1'); h1.after(bar); } else app.insertBefore(bar,app.firstChild); } }
    function close(){menu.hidden=true; btn.setAttribute('aria-expanded','false')}
    btn.onclick=function(e){e.stopPropagation(); var o=menu.hidden; menu.hidden=!o; btn.setAttribute('aria-expanded',o); if(o) fill();};
    document.addEventListener('click',function(e){ if(!box.contains(e.target)) close(); });
    document.addEventListener('keydown',function(e){ if(e.key==='Escape') close(); });
    var G='<svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true"><path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8c-.5 2.8-2.1 5.1-4.4 6.7v5.5h7.1c4.2-3.8 6.6-9.5 6.6-16.2z"/><path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.3l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.5-3.8-12.2-9H4.5v5.7C8.1 41.1 15.5 46 24 46z"/><path fill="#FBBC05" d="M11.8 28.3c-.4-1.3-.7-2.8-.7-4.3s.3-3 .7-4.3V14H4.5C3 17 2 20.4 2 24s1 7 2.5 10l7.3-5.7z"/><path fill="#EA4335" d="M24 10.7c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C34.9 4.2 29.9 2 24 2 15.5 2 8.1 6.9 4.5 14l7.3 5.7c1.7-5.2 6.5-9 12.2-9z"/></svg>';
    function paint(){
      close();
      if(SY.user){
        var n=(SY.user.name||'').trim()||(SY.user.email||'').split('@')[0];
        btn.innerHTML=''; var av=el('span','acct-av',(n||'?').charAt(0)); btn.append(av, el('span','acct-t','שלום, '+n));
        btn.setAttribute('aria-label','שלום '+n+' — תפריט חשבון'); box.classList.add('in');
      } else {
        btn.innerHTML=G; btn.append(el('span','acct-t','התחברות')); btn.setAttribute('aria-label','התחברות עם Google'); box.classList.remove('in');
        gsiReady();
      }
    }
    function fill(){
      menu.innerHTML='';
      if(SY.user){
        if(SY.user.email) menu.append(el('p','acct-mail',SY.user.email));
        menu.append(el('p','pg-hint','ההתקדמות נשמרת בחשבון ומסתנכרנת בין המכשירים.'));
        var out=el('button','btn','התנתקות'); out.type='button'; out.onclick=logout; menu.append(out);
      } else {
        menu.append(el('p','acct-h','המשיכו מאותה נקודה בכל מכשיר'));
        var slot=el('div','pg-gbtn'); menu.append(slot); gButton(slot);
        var pv=el('a','pg-hint','מה נשמר? מדיניות הפרטיות'); pv.href='/privacy/'; menu.append(pv);
      }
    }
    paint.w=box; syncEls.push(paint); paint();
  })();
  api('/api/auth/me').then(function(j){ SY.checked=true; if(j&&j.user){SY.user=j.user; paintSync(); pull()} else paintSync(); }).catch(function(){});
  /* human review mark: a stamp icon beside the daf title; tap it for who checked the page and when */
  (function(){
    var art=document.querySelector('article.daf'), h1=art&&art.querySelector('header .titlerow h1'); if(!h1) return;
    var m=location.pathname.match(/^\/([a-z]+)\/(\d+)\/?$/); if(!m) return; var page=m[1]+'/'+m[2];
    var STAMP='<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="3.2"/><path d="M6.5 15.5c.8-2.6 3-4 5.5-4s4.7 1.4 5.5 4"/><path d="M4 18.5h16"/><path d="M5.5 21h13"/></svg>';
    var b=el('button','hr-stamp'); b.type='button'; b.innerHTML=STAMP; b.hidden=true; b.setAttribute('aria-expanded','false');
    var pop=el('div','hr-pop'); pop.hidden=true; h1.appendChild(b); h1.parentNode.appendChild(pop);
    function fmt(d){ var p=(d||'').split('-'); return p.length===3?(+p[2])+'.'+(+p[1])+'.'+p[0]:''; }
    function show(r){ b.hidden=!r; if(!r){ pop.hidden=true; return; }
      b.setAttribute('aria-label','נבדק על ידי אדם — פרטים'); b.title='נבדק על ידי אדם';
      pop.innerHTML=''; pop.append(el('b',null,'✓ נבדק על ידי אדם'), el('span',null,r.by?'בודק: '+r.by:''), el('span',null,r.at?'תאריך: '+fmt(r.at):''),
        el('span','hr-note','הדף נקרא ונבדק מול הגמרא על ידי לומד, בנוסף לבדיקות האוטומטיות.')); }
    b.onclick=function(e){ e.stopPropagation(); pop.hidden=!pop.hidden; b.setAttribute('aria-expanded',!pop.hidden); };
    document.addEventListener('click',function(e){ if(!pop.hidden&&!pop.contains(e.target)){ pop.hidden=true; b.setAttribute('aria-expanded','false'); } });
    function load(){ fetch('/api/reviewed?page='+encodeURIComponent(page)).then(function(r){return r.json()}).then(function(j){ show(j&&j.review); }).catch(function(){}); }
    load(); window.__rvRefresh=load;
  })();
  var toastEl=null, toastT=null;
  function toast(msg,undo){
    if(!toastEl){toastEl=el('div','pg-toast'); toastEl.setAttribute('role','status'); toastEl.setAttribute('aria-live','polite'); document.body.appendChild(toastEl);}
    toastEl.innerHTML=''; toastEl.appendChild(el('span',null,msg));
    if(undo){var u=el('button',null,'בטל'); u.type='button'; u.onclick=function(){undo(); toastEl.hidden=true;}; toastEl.appendChild(u);}
    toastEl.hidden=false; clearTimeout(toastT); toastT=setTimeout(function(){toastEl.hidden=true},5000);
  }

  /* after a finished daf, readers who are not signed in get one invitation (at most every 5 days) */
  function nudge(){
    if(SY.user||!SY.checked) return; var k='daf-signin-nudge', t=0; try{t=+localStorage.getItem(k)||0}catch(e){}
    if(Date.now()-t<5*864e5) return; try{localStorage.setItem(k,String(Date.now()))}catch(e){}
    var n=el('div','pg-toast signin-nudge'); n.setAttribute('role','status');
    n.append(el('span',null,'כל הכבוד על הדף! ההתקדמות נשמרת רק בדפדפן הזה — התחברו כדי לא לאבד אותה ולהמשיך בכל מכשיר.'));
    var b=el('button',null,'התחברות'); b.type='button'; b.onclick=function(){ n.remove(); var a=document.querySelector('.acct-btn'); if(a){ window.scrollTo({top:0,behavior:'smooth'}); a.click(); } };
    var x=el('button',null,'×'); x.type='button'; x.setAttribute('aria-label','סגור'); x.onclick=function(){n.remove()};
    n.append(b,x); document.body.appendChild(n); setTimeout(function(){n.remove()},20000);
  }

  /* ---------- daf page: tracking is passive — a sugya viewed long enough counts as learned ---------- */
  var art=document.querySelector('article.daf'), P=art&&byKey(location.pathname.replace(/^\/|\/$/g,''));
  var E=null;
  if(art&&P){
    var RM=/(^|[?&])r(=|&|$)/.test(location.search.slice(1));   /* ?r = חזרה: summaries, verdicts and the summary table only */
    var firstVisit=!S.pages[P.k], pre=art.id+'-', secs={}, navA={}, laterB={}, learnB={}; E=entry(P.k);
    if(RM){ art.classList.add('review-mode');
      art.querySelectorAll('details.flowd,details.storyline,details.aids').forEach(function(d){d.open=true});
      art.querySelectorAll('section.sugya ol.steps').forEach(function(ol){ var b=el('button','btn pg-steps','הצג את השקלא וטריא'); b.type='button';
        b.onclick=function(){ ol.closest('section.sugya').classList.toggle('expand'); b.textContent=ol.closest('section.sugya').classList.contains('expand')?'הסתר את השקלא וטריא':'הצג את השקלא וטריא'; };
        ol.before(b); });
      var rb=el('div','pg-rmode'); rb.appendChild(el('span',null,'מצב חזרה — תקצירים, מסקנות וסיכום בלבד')); var full=el('a',null,'לדף המלא'); full.href=location.pathname; rb.appendChild(full);
      var ctr0=art.querySelector('.controls'); (ctr0||art.querySelector('header')).after(rb);
      setTimeout(function(){ markDay(); touch(); save(); },20000);   /* a review visit counts for the streak */
    }
    var pn=art.querySelector('.prefs'); if(pn) pn.appendChild(settings());
    /* starting in the middle of a masechet: offer to mark the earlier dapim as learned (asked once per masechet) */
    (function(){
      var M=C.mas[P.s]; if(!M||!firstVisit||S.asked[P.s]||P.d<=M.first||(S.pre[P.s]||0)>=P.d-1) return;
      var any=L.some(function(p){return p.s===P.s&&p.d<P.d&&S.pages[p.k]&&Object.keys(S.pages[p.k].s).length});
      if(any) return;
      var bx=el('div','pg-ask'); bx.setAttribute('role','region'); bx.setAttribute('aria-label','התחלה באמצע המסכת');
      var rng=heb(M.first)+(P.d-1>M.first?'–'+heb(P.d-1):'');
      bx.appendChild(el('p',null,'מתחילים ללמוד מדף '+heb(P.d)+'? לסמן את דפים '+rng+' במסכת '+M.he+' כנלמדו?'));
      var yes=el('button','btn','כן, סמן כנלמדו'), no=el('button','btn','לא, תודה'); yes.type=no.type='button';
      function done(){ S.asked[P.s]=Date.now(); save(); bx.remove(); }
      yes.onclick=function(){
        var snap=JSON.stringify({pre:S.pre,pages:S.pages});
        S.pre[P.s]=P.d-1;
        L.forEach(function(p){ if(p.s===P.s&&p.d<P.d){ var e=entry(p.k); p.n.forEach(function(id){e.s[id]='learned'}); e.done=e.done||today(); } });
        touch(); done(); refresh();
        toast('דפים '+rng+' סומנו כנלמדו',function(){ var o=JSON.parse(snap); S.pre=o.pre; S.pages=o.pages; E=entry(P.k); save(); refresh(); });
      };
      no.onclick=done;
      var row=el('div','pg-btns'); row.append(yes,no); bx.appendChild(row);
      var ctr=art.querySelector('.controls'); (ctr||art.querySelector('header')).after(bx);
    })();
    art.querySelectorAll('nav.map a[href^="#"]').forEach(function(a){ navA[a.getAttribute('href').slice(1+pre.length)]=a; });
    var mh=art.querySelector('nav.map h2'); if(mh){ var lg=el('p','pg-legend-line');
      var l1=el('span'); l1.append(ticks('opened'),document.createTextNode('נפתח'));
      var l2=el('span'); l2.append(ticks('learned'),document.createTextNode('נלמד'));
      var l3=el('span'), b3=el('span','pg-bk'); b3.innerHTML=BOOK; l3.append(b3,document.createTextNode('ללמוד אחר כך'));
      lg.append(l1,l2,l3); mh.after(lg); }
    function secTools(sec){var t=sec.querySelector('.sec-tools'); if(t) return t; var host=sec.querySelector(':scope > .amud'); t=document.createElement('span'); t.className='sec-tools'; if(host) host.appendChild(t); else {var h=sec.querySelector('h3'); if(!h) return null; h.insertBefore(t,h.firstChild)} return t}
    P.n.forEach(function(id){
      var sec=document.getElementById(pre+id); if(!sec) return; secs[id]=sec;
      var tl=secTools(sec); if(!tl) return;
      var b=el('button','fb-sec pg-later'); b.type='button';
      b.onclick=function(){ var k=P.k+'#'+id, was=S.later[k];
        if(was) delete S.later[k]; else {S.later[k]=Date.now(); touch();} save(); paint();
        toast(was?'הוסר מ״ללמוד אחר כך״':'נשמר ל״ללמוד אחר כך״ — מופיע בדף הבית',function(){ if(was) S.later[k]=was; else delete S.later[k]; save(); paint(); }); };
      b.innerHTML=BOOK; tl.insertBefore(b,tl.firstChild); laterB[id]=b;
      /* learned mark on the sugya itself: shows ✓ / ✓✓ and toggles learned <-> not learned */
      var lb=el('button','fb-sec pg-lrn'); lb.type='button';
      lb.onclick=function(){ var was=E.s[id]; E.s[id]=was==='learned'?'opened':'learned';
        if(E.s[id]==='learned'){ delete S.later[P.k+'#'+id]; markDay(); } touch(); save(); paint();
        toast(E.s[id]==='learned'?'הסוגיה סומנה כנלמדה':'הסימון ״נלמד״ בוטל',function(){ if(was) E.s[id]=was; else delete E.s[id]; save(); paint(); }); };
      var h3=sec.querySelector(':scope > h3'); if(h3){ h3.classList.add('has-lrn'); h3.appendChild(lb); } else tl.insertBefore(lb,tl.firstChild); learnB[id]=lb;
    });
    /* finished the daf: a clear banner after the last sugya, leading to the understanding questions */
    var qsec=document.getElementById(art.id+'-quiz'), dban=null;
    function banner(){
      var on=!!E.done; if(!qsec) return;
      var sig=on?(E.quiz?E.quiz.best+'/'+E.quiz.of:'-'):''; if(dban&&dban.dataset.sig===sig) return;
      if(dban){ dban.remove(); dban=null; } if(!on) return;
      dban=el('div','done-ban'); dban.dataset.sig=sig; dban.setAttribute('role','status');
      var h1=art.querySelector('header h1'), nm=h1?h1.textContent.trim():'הדף';
      var hd=el('div','db-h'); hd.append(el('span','db-ck','✓'), el('span',null,'סיימת את '+nm)); dban.appendChild(hd);
      var nq=(art.querySelectorAll('.quiz .qitem').length)||8;
      dban.appendChild(el('p','db-p', E.quiz ? 'שאלות ההבנה: '+E.quiz.best+' מתוך '+E.quiz.of+(E.quiz.best<E.quiz.of?' — השאלות שפספסת יחזרו אליך בחזרה של מחר.':' — הבנה מלאה!')
        : 'עכשיו הזמן לבדוק שהדף ברור: '+nq+' שאלות הבנה — למה, מה ההבדל, ומה הדין במקרה חדש. לא שינון.'));
      var row=el('div','db-row');
      if(!E.quiz){ var qa=el('a','btn db-go','לשאלות ההבנה ↓'); qa.href='#'+qsec.id; row.appendChild(qa); }
      var nx=[].filter.call(art.querySelectorAll('.pager a'),function(x){return x.textContent.indexOf('←')>=0})[0];
      if(nx){ var na=el('a','btn','לדף הבא ←'); na.href=nx.href; row.appendChild(na); }
      dban.appendChild(row); qsec.before(dban);
    }
    function paint(){
      banner();
      var ab=art.querySelector('.controls [data-role="learned"]');
      if(ab&&ab.dataset.all!==String(nLearned(P)===P.n.length)){ var all=nLearned(P)===P.n.length; ab.dataset.all=String(all); ab.setAttribute('aria-pressed',all); ab.innerHTML=''; if(all) ab.appendChild(ticks('learned')); ab.appendChild(document.createTextNode((all?' ':'')+'למדתי'));
        ab.title=all?'כל הסוגיות סומנו כנלמדו — הקש לביטול':'סמן את כל הסוגיות בדף כנלמדו'; }
      P.n.forEach(function(id){
        var lb=learnB[id]; if(lb){ var st=E.s[id], lr=st==='learned', sg=st||'-'; if(lb.dataset.sig!==sg){ lb.dataset.sig=sg; lb.innerHTML='';
          var tk=ticks(lr?'learned':'opened'); if(tk) lb.appendChild(tk); lb.classList.toggle('on',lr); lb.setAttribute('aria-pressed',lr);
          lb.dataset.tip=lr?'נלמד — הקש לביטול':'סמן את הסוגיה כנלמדה'; lb.setAttribute('aria-label',lb.dataset.tip); } }
        var on=!!S.later[P.k+'#'+id], b=laterB[id];
        if(b){ b.classList.toggle('on',on); b.setAttribute('aria-pressed',on); b.dataset.tip=on?'סומן ללמוד אחר כך — הקש לביטול':'ללמוד אחר כך'; b.setAttribute('aria-label',b.dataset.tip); }
        var a=navA[id]; if(!a) return; var sig=(E.s[id]||'')+(on?'+b':''), o=a.querySelector('.pg-mk');
        if(o&&o.dataset.sig===sig) return;  /* unchanged: don't touch the link (replacing nodes mid-tap swallows the click) */
        if(o) o.remove();
        var mk=el('span','pg-mk'), t=ticks(E.s[id]); mk.dataset.sig=sig; if(t) mk.appendChild(t);
        if(on){ var bk=el('span','pg-bk'); bk.innerHTML=BOOK; bk.setAttribute('aria-label','ללמוד אחר כך'); mk.appendChild(bk); }
        var am=a.querySelector('.amud'); if(am) am.after(mk); else a.insertBefore(mk,a.firstChild);
      });
    }
    painters.push(paint);
    /* progress rail: a thin bar on the page edge, one segment per sugya (height ∝ its length), coloured by
       state (opened / learned) with a marker for the reading position; a small pill shows "x/n" while
       scrolling. Tap or drag on it to jump to a sugya (only while it is shown). */
    (function(){
      if(RM||!P.n.length) return;
      var ids=P.n.filter(function(id){return secs[id]}); if(!ids.length) return;
      var rail=el('div','pg-rail'), mark=el('i','pg-rail-at'), pill=el('div','pg-rail-pill'), seg={}, pillT=null;
      rail.setAttribute('aria-hidden','true'); pill.setAttribute('aria-hidden','true');
      ids.forEach(function(id){ seg[id]=el('b'); rail.appendChild(seg[id]); });
      rail.appendChild(mark); document.body.append(rail,pill);
      /* equal segments (sections below the fold have estimated heights); the marker moves through the
         current sugya's segment in proportion to how far into it the reading line is */
      function layout(){}
      function colour(){ ids.forEach(function(id){ seg[id].className=E.s[id]==='learned'?'l':E.s[id]==='opened'?'o':''; }); }
      var q=false, n=ids.length;
      function pos(show){
        var line=window.innerHeight*0.45, i=-1, f=0;
        for(var k=0;k<n;k++){ var r=secs[ids[k]].getBoundingClientRect(); if(r.top<=line){ i=k; f=Math.min(1,(line-r.top)/Math.max(1,r.height)); } }
        var lastR=secs[ids[n-1]].getBoundingClientRect(), inside=i>=0&&lastR.bottom>=line-40;
        rail.classList.toggle('on',inside); if(i<0) return;
        var p=(i+f)/n; mark.style.top=(p*100)+'%';
        var nl=ids.filter(function(id){return E.s[id]==='learned'}).length;
        pill.textContent='סוגיה '+(i+1)+' מתוך '+n+(nl?' · נלמדו '+nl:'');
        pill.style.top='calc(12vh + '+(p*76).toFixed(2)+'vh)';
        if(show&&inside){ pill.classList.add('on'); clearTimeout(pillT); pillT=setTimeout(function(){pill.classList.remove('on')},1100); }
      }
      window.addEventListener('scroll',function(){ if(q) return; q=true; requestAnimationFrame(function(){q=false; pos(true)}); },{passive:true});
      var rt=null; window.addEventListener('resize',function(){ clearTimeout(rt); rt=setTimeout(function(){layout(); pos(false)},150); });
      document.addEventListener('toggle',function(){ clearTimeout(rt); rt=setTimeout(function(){layout(); pos(false)},150); },true);
      /* tap or drag along the rail to jump between sugyot: the pill names the sugya under the finger, release scrolls there */
      function idxAt(y){ var r=rail.getBoundingClientRect(); return Math.max(0,Math.min(n-1,Math.floor((y-r.top)/Math.max(1,r.height)*n))); }
      function ttl(id){ var h=secs[id].querySelector('h2,h3'); return h?h.textContent.trim():''; }
      var drag=-1;
      function show(i){ var t=ttl(ids[i]); pill.textContent='סוגיה '+(i+1)+' מתוך '+n+(t?' · '+(t.length>34?t.slice(0,33)+'…':t):'');
        pill.style.top='calc(12vh + '+(((i+0.5)/n)*76).toFixed(2)+'vh)'; pill.classList.add('on'); clearTimeout(pillT); }
      rail.addEventListener('pointerdown',function(e){ if(!rail.classList.contains('on')) return; e.preventDefault(); drag=idxAt(e.clientY); show(drag);
        try{rail.setPointerCapture(e.pointerId)}catch(x){} });
      rail.addEventListener('pointermove',function(e){ if(drag<0) return; var i=idxAt(e.clientY); if(i!==drag){drag=i; show(i);} });
      function end(){ if(drag<0) return; var id=ids[drag]; drag=-1;
        var y=secs[id].getBoundingClientRect().top+window.scrollY-70; window.scrollTo({top:Math.max(0,y),behavior:'smooth'});
        pillT=setTimeout(function(){pill.classList.remove('on')},1200); }
      rail.addEventListener('pointerup',end); rail.addEventListener('pointercancel',function(){drag=-1; pill.classList.remove('on');});
      painters.push(colour); var p0=paint; paint=function(){p0(); colour();};
      setTimeout(function(){ layout(); colour(); pos(false); },300);
      window.addEventListener('load',function(){ layout(); pos(false); });
    })();
    /* viewing rule: time counts while a sugya fills a good part of the screen (≥40% of it, or ≥60% of the
       sugya); ~3s → opened (✓). Learned (✓✓) once its end has been on screen and it got enough time for its
       length (4–20s), so scrolling through while reading counts, a fast fling does not. */
    var cur=null, acc={}, sawEnd={}, lastT=Date.now();
    function need(h,vh){ return Math.min(20,Math.max(4,h/vh*2.5))*1000; }
    function tick(){
      var now=Date.now(), dt=Math.min(now-lastT,2000); lastT=now; if(document.hidden) return;
      var vh=window.innerHeight, ch=false;
      Object.keys(secs).forEach(function(id){
        var r=secs[id].getBoundingClientRect(), h=Math.max(1,r.height), vis=Math.min(r.bottom,vh)-Math.max(r.top,0);
        if(vis<=0) return;
        if(vis>=0.4*vh||vis>=0.6*h) acc[id]=(acc[id]||0)+dt;
        if(r.bottom<=vh+4) sawEnd[id]=true;
        var st=E.s[id];
        if(!st&&acc[id]>=3000){E.s[id]='opened'; st='opened'; ch=true}
        if(st!=='learned'&&sawEnd[id]&&acc[id]>=need(h,vh)){E.s[id]='learned'; markDay(); ch=true}
      });
      if(ch){ var was=E.done; E.done=nLearned(P)===P.n.length?(E.done||today()):null; touch(); save(); paint(); if(E.done&&!was){ nudge(); revSync(); } }
    }
    if(!RM) setInterval(tick,1000);
    document.addEventListener('visibilitychange',function(){lastT=Date.now()});
    if('IntersectionObserver' in window){
      var io=new IntersectionObserver(function(es){es.forEach(function(en){
        if(!en.isIntersecting) return; cur=en.target.id.slice(pre.length);
        var li=S.last&&S.last.page===P.k?P.n.indexOf(S.last.section):-1;
        if(P.n.indexOf(cur)>=li){ S.last={page:P.k,section:cur,ts:Date.now()}; save(); }  /* resume = furthest point reached */
      })},{rootMargin:'-45% 0px -50% 0px'});
      Object.keys(secs).forEach(function(id){io.observe(secs[id])});
    }
    /* "למדתי" in the top bar: mark every sugya learned (press again to undo) */
    var allB=art.querySelector('.controls [data-role="learned"]');
    if(allB) allB.addEventListener('click',function(){
      var all=nLearned(P)===P.n.length, snap=JSON.stringify({s:E.s,done:E.done,later:S.later});
      P.n.forEach(function(id){ if(all) E.s[id]='opened'; else { E.s[id]='learned'; delete S.later[P.k+'#'+id]; } });
      if(!all) markDay(); var was=E.done; E.done=all?null:(E.done||today()); touch(); save(); paint(); if(E.done&&!was){ setTimeout(nudge,5500); revSync(); }
      toast(all?'הסימון בוטל':'סומנו '+P.n.length+' סוגיות כנלמדו',function(){ var o=JSON.parse(snap); E.s=o.s; E.done=o.done; S.later=o.later; save(); paint(); });
    });
    /* quiz: best score + missed questions for later review (not needed for "learned") */
    var qb=art.querySelector('[data-role="quizBox"]');
    var qRest=false;
    if(qb) qb.addEventListener('click',function(ev){ var o=ev.target.closest('.opt'); if(!o||qRest) return;
      var qi=[].indexOf.call(qb.querySelectorAll('.qitem'),o.closest('.qitem'));
      if(qi>=0&&o.dataset.j!=null){ E.qa=E.qa||{}; if(E.qa[qi]==null){ E.qa[qi]=+o.dataset.j; touch(); save(); } } });
    var rq=art.querySelector('[data-role="resetQuiz"]'); if(rq) rq.addEventListener('click',function(){ if(E.qa){ delete E.qa; touch(); save(); } });
    /* answers given before show again when the page is reopened (״התחל מחדש״ clears them) */
    if(qb&&E.qa) setTimeout(function(){ qRest=true; var its=qb.querySelectorAll('.qitem');
      Object.keys(E.qa).forEach(function(i){ var it=its[+i]; if(!it||it.dataset.done) return; var bt=it.querySelector('.opt[data-j="'+E.qa[i]+'"]'); if(bt) bt.click(); });
      qRest=false; var n=Object.keys(E.qa).length;
      if(n&&!qb.querySelector('.q-was')){ var w=el('p','q-was','ענית כבר על '+n+' מתוך '+its.length+' שאלות — התשובות שלך מוצגות. ״התחל מחדש״ למטה מאפס אותן.'); qb.before(w);
        var rq2=art.querySelector('[data-role="resetQuiz"]'); if(rq2) rq2.addEventListener('click',function(){ w.remove(); },{once:true}); }
    },60);
    if(qb) qb.addEventListener('click',function(ev){ if(!ev.target.closest('.opt')) return; setTimeout(function(){
      var items=qb.querySelectorAll('.qitem'), done=qb.querySelectorAll('.qitem[data-done]'); if(!items.length||done.length<items.length) return;
      var right=0, spare=2; items.forEach(function(q,i){ var ok=!q.querySelector('.opt.wrong'); if(ok) right++;
        var inQ=S.review.some(function(r){return r.page===P.k&&r.q===i});
        if(!ok&&!inQ) S.review.push({page:P.k,q:i,due:addDays(today(),1),n:0});
        else if(ok&&!inQ&&spare>0&&dueList().length<RVN*2){ spare--; S.review.push({page:P.k,q:i,due:addDays(today(),3),n:1}); }  /* a couple of correct ones come back too */
      });
      if(!E.quiz||right>E.quiz.best) E.quiz={best:right,of:items.length,ts:Date.now()}; touch(); save(); banner();
    },0)});
    /* חברותא: remember what the learner knew per sugya */
    document.addEventListener('daf:cv',function(ev){ var d=ev.detail, sid=(d.sec||'').slice(pre.length); if(!sid) return;
      E.cv=E.cv||{}; E.cv[sid]=E.cv[sid]||{}; E.cv[sid][d.k]=d.ok?1:0; touch(); save(); });
    /* free recall before the summary table */
    (function(){ var sum=document.getElementById(pre+'sum'); if(!sum) return;
      var body=[].slice.call(sum.children).filter(function(c){return !c.classList.contains('amud')&&c.tagName!=='H3'});
      if(!body.length||E.recall||RM) return;
      body.forEach(function(c){c.hidden=true});
      var bx=el('div','pg-recall'); bx.appendChild(el('p',null,'נסו להיזכר: מה 3 עיקרי הדף?'));
      var sh=el('button','btn','הצג את הסיכום'); sh.type='button';
      sh.onclick=function(){ body.forEach(function(c){c.hidden=false}); sh.remove();
        var q=el('div','pg-btns pg-grade'); q.appendChild(el('span','pg-hint','זכרת?'));
        [['all','הכול'],['part','חלקית'],['none','שכחתי']].forEach(function(x){ var b=el('button','btn',x[1]); b.type='button';
          b.onclick=function(){ E.recall={r:x[0],ts:Date.now()}; touch(); save(); q.replaceWith(el('p','pg-hint','נשמר. '+(x[0]==='all'?'יפה!':'כדאי לחזור על הסיכום מחר.'))); };
          q.appendChild(b); });
        bx.appendChild(q); };
      bx.append(sh); var h=sum.querySelector('h3'); (h||sum.firstChild).after(bx);
    })();
    /* open with yesterday: 2 questions from the previous daf the learner studied */
    (function(){ var prev=byKey(P.s+'/'+(P.d-1)); if(RM||!prev||!S.pages[prev.k]) return;
      if(E.warm===today()) return;
      var bx=el('div','pg-warm'); var h=el('p',null,'חזרה על '+prev.h+' לפני שמתחילים: 2 שאלות'); var go=el('button','btn','התחל'); go.type='button';
      var skip=el('button','btn','דלג'); skip.type='button'; skip.onclick=function(){E.warm=today(); save(); bx.remove();};
      var sumL=el('a','btn','סיכום '+prev.h); sumL.href=url(prev)+'?r';
      var row=el('div','pg-btns'); row.append(go,sumL,skip); bx.append(h,row);
      go.onclick=function(){ row.remove(); bank().then(function(B){ var Q=B[prev.k]||[]; if(!Q.length){bx.remove();return}
        var idx=Q.map(function(_,i){return i}).sort(function(){return Math.random()-.5}).slice(0,2), left=idx.length;
        idx.forEach(function(i){ var w=el('div','qitem'); bx.appendChild(w); renderQ(w,Q[i],prev,function(ok){ enqueue(prev.k,i,ok); if(--left===0){ E.warm=today(); save(); } }); }); }); };
      var ctr=art.querySelector('nav.map'); if(ctr) ctr.before(bx);
    })();
    paint();
  }

  /* ---------- shared: a daf chip with its ticks ---------- */
  function chip(p,d,t,slug){
    var st=dafState(slug||(p&&p.s),d,p), c=el(p?'a':'span','pg-chip '+(p||st==='learned'?st:'na')+(p&&t&&t.k===p.k?' today':''));
    c.appendChild(el('span','pg-n',heb(d)));
    if(!p&&st==='learned') c.appendChild(ticks('learned'));
    if(p){ c.href=url(p)+(st==='learned'?'?r':''); if(st==='learned') c.title='חזרה על '+p.h; var tk=ticks(st); if(tk) c.appendChild(tk); var qz=S.pages[p.k]&&S.pages[p.k].quiz; if(qz&&qz.best/qz.of>=0.75){ var sr=el('span','pg-star','★'); sr.title='חזרה: '+qz.best+'/'+qz.of; c.appendChild(sr); } if(laterIn(p).length){var bk=el('span','pg-bk'); bk.innerHTML=BOOK; c.appendChild(bk);}
      c.setAttribute('aria-label',p.h+(st==='learned'?' · נלמד':st==='progress'?' · בתהליך':'')); }
    else c.title='דף '+heb(d)+' — עוד לא באתר';
    return c;
  }
  function laterList(){ return Object.keys(S.later).sort(function(a,b){return S.later[a]-S.later[b]}).map(function(k){
    var a=k.split('#'), p=byKey(a[0]); if(!p) return null; var i=p.n.indexOf(a[1]); return i<0?null:{p:p,id:a[1],i:i}; }).filter(Boolean); }
  /* ---------- spaced review ---------- */
  var LADDER=[1,3,7,21,60];
  function bank(){ return window.__qb||(window.__qb=fetch('/quiz.json').then(function(r){return r.json()}).catch(function(){return {}})); }
  function dueList(){ var t=today(); return S.review.filter(function(r){return r.due<=t}).sort(function(a,b){return a.due<b.due?-1:a.due>b.due?1:0}); }
  function enqueue(k,i,ok){ if(!ok&&!S.review.some(function(r){return r.page===k&&r.q===i})) S.review.push({page:k,q:i,due:addDays(today(),1),n:0}); markDay(); touch(); save(); }
  function grade(r,ok){ if(ok){ r.n=(r.n||0)+1; if(r.n>=LADDER.length) S.review.splice(S.review.indexOf(r),1); else r.due=addDays(today(),LADDER[r.n]); }
    else { r.n=0; r.due=addDays(today(),1); } markDay(); touch(); save(); }
  /* one multiple-choice question: shuffled options, explanation (and why the chosen option is wrong, when the data has it) */
  function renderQ(w,item,p,cb){
    if(p){ var cx=el('div','q-ctx'); var ca=el('a',null,p.h+(item.st?' · '+item.st:'')); ca.href=url(p)+(item.s?'#'+p.s+p.d+'-'+item.s:''); cx.appendChild(ca); w.appendChild(cx); }
    w.appendChild(el('p',null,item.q)); var opts=el('div','opts'), fb=el('div','fb'); fb.setAttribute('aria-live','polite');
    var order=item.o.map(function(_,j){return j}); for(var x=order.length-1;x>0;x--){var r=Math.floor(Math.random()*(x+1)),t=order[x];order[x]=order[r];order[r]=t;}
    var btns={}, done=false;
    order.forEach(function(j){ var b=el('button','opt',item.o[j]); b.type='button'; btns[j]=b; opts.appendChild(b);
      b.onclick=function(){ if(done) return; done=true; var ok=j===item.a; b.classList.add(ok?'right':'wrong'); if(!ok) btns[item.a].classList.add('right');
        var v=el('b','qv '+(ok?'ok':'no'),ok?'✓ נכון.':'✗ לא בדיוק.'); fb.append(v,document.createTextNode(' '+(!ok&&item.w&&item.w[j]?item.w[j]+' ':'')+item.e+' '));
        if(p){ var a=el('a',null,'(סיכום '+p.h+')'); a.href=url(p)+'?r'; fb.appendChild(a); } cb(ok); }; });
    w.append(opts,fb);
  }
  function laterRow(x){ var a=el('a','pg-row-l'); a.href=url(x.p)+'#'+x.p.s+x.p.d+'-'+x.id; var bk=el('span','pg-bk'); bk.innerHTML=BOOK;
    a.append(bk,document.createTextNode(' '+x.p.h+' · סוגיה '+(x.i+1))); return a; }

  /* ---------- home: today's daf (hero), a sign-in invitation, then personal tiles ---------- */
  var home=document.getElementById('progress-home');
  if(home){
    var HD={}; try{HD=JSON.parse(document.getElementById('home-data').textContent)}catch(e){}
    function tile(cls,href,icon,k,big,sub){
      var t=el(href?'a':href===false?'div':'button','tl'+(cls?' '+cls:'')); if(href) t.href=href; else if(href!==false) t.type='button';
      var hd=el('span','tl-k'); hd.append(el('span','tl-i',icon),document.createTextNode(k)); t.appendChild(hd);
      if(big!=null) t.appendChild(el('span','tl-n',big)); if(sub) t.appendChild(el('span','tl-s',sub)); return t; }
    function paintHome(){
      home.innerHTML=''; home.className='pg-home';
      var pl=plan(), tp=pl.today, hero=el('a','hero');
      hero.appendChild(el('div','hero-k',S.pace.mode==='plan'?'לפי הקצב שלך · היום':'הדף היומי · היום'));
      if(tp){ hero.href=url(tp); var hh=el('div','hero-h',tp.h+' '); var tk=ticks(stateOf(tp)); if(tk) hh.appendChild(tk); hero.appendChild(hh);
        hero.appendChild(el('p','hero-t',tp.t));
        var c=nLearned(tp), qz=S.pages[tp.k]&&S.pages[tp.k].quiz, ft=el('div','hero-f');
        var meta=el('span','hero-m',tp.n.length+' סוגיות'+(c?' · '+c+' נלמדו':'')+(qz?' · חזרה '+qz.best+'/'+qz.of:''));
        var go=el('span','hero-go',c===tp.n.length&&c?'✓ נלמד · לחזרה ←':c?'להמשיך ←':'להתחיל ללמוד ←'); ft.append(meta,go); hero.appendChild(ft);
        if(c){ var bar=el('span','pg-bar'), f=el('i'); f.style.width=Math.round(100*c/tp.n.length)+'%'; bar.appendChild(f); hero.appendChild(bar); } }
      else { hero.classList.add('empty'); hero.appendChild(el('p','hero-t',pl.beyond?'הדף הבא עוד לא פורסם באתר — מתעדכן כל לילה':'אין דף להיום')); }
      home.appendChild(hero);

      /* sign-in invitation: progress lives only in this browser until the reader connects an account */
      if(SY.checked&&!SY.user){
        var sg=el('div','signin'), tx=el('div','signin-x');
        tx.append(el('b',null,S.first?'ההתקדמות שלך שמורה רק בדפדפן הזה':'שמרו את הלימוד שלכם'),
          el('span',null,'התחברו עם Google — ותמשיכו מאותה נקודה בטלפון ובמחשב, בלי לאבד רצף, סימונים ושאלות לחזרה.'));
        var slot=el('div','pg-gbtn'); sg.append(tx,slot); gButton(slot); home.appendChild(sg); }

      var g=el('div','tiles'), hw=document.getElementById('howto'), seen=false; try{seen=!!localStorage.getItem('howto-seen')}catch(e){}
      function howTile(){ var ht=tile(seen?'':'new',null,'💡','איך משתמשים','3 דקות','חזרה, תצוגת עץ, חברותא ומקורות'); ht.onclick=function(){ if(hw.showModal) hw.showModal(); else hw.setAttribute('open',''); }; return ht; }
      if(hw&&!seen) g.appendChild(howTile());   /* first visit: the guide comes first */
      /* continue: the first sugya not yet learned, from the last place read onward (that daf, then the next dapim) */
      if(S.last){ var lp=byKey(S.last.page), k0=lp?L.indexOf(lp):-1, rs=null;
        for(var q=k0; q>=0&&q<L.length&&!rs; q++){ var pq=L[q]; if(pq.s!==lp.s) break; if(learnedP(pq)) continue;
          var eq=S.pages[pq.k], idq=pq.n.filter(function(id){ return !(eq&&eq.s[id]==='learned'); })[0];
          if(idq) rs={p:pq,id:idq,i:pq.n.indexOf(idq)}; }
        if(rs) g.insertBefore(tile('hot',url(rs.p)+(rs.i>0?'#'+rs.p.s+rs.p.d+'-'+rs.id:''),'↩','המשך מהמקום',rs.p.h,'סוגיה '+(rs.i+1)+' מתוך '+rs.p.n.length),g.firstChild); }
      if(S.first||S.review.length){
      var dl=dueList(), rv;
      var sn=Math.min(dl.length,RVN);   /* one short session, not the whole backlog — the rest waits for the next days */
      if(dl.length) rv=tile('hot','/review/','🔁','חזרה היום',sn+(sn===1?' שאלה':' שאלות'),'כ־'+Math.max(1,Math.round(sn*0.5))+' דק׳ · לפני הדף החדש');
      else rv=tile('','/review/','🔁','חזרה היום',S.review.length?'✓ הכול':'—',S.review.length?'השאלות הבאות יחזרו לפי הלוח':'שאלה שטעיתם בה תחזור לכאן');
      g.appendChild(rv);
      var sk=streak(); g.appendChild(tile(sk?'warm':'',false,'🔥','רצף',sk?sk+(sk===1?' יום':' ימים'):'0',sk?'ימי לימוד ברציפות (שבת לא שוברת)':'לומדים כל יום? הרצף נספר כאן'));
      }
      var ms=tp?tp.s:Object.keys(C.mas)[0];
      if(ms&&C.mas[ms]){ var m=C.mas[ms], tot=m.last-m.first+1, done=0; for(var dd=m.first; dd<=m.last; dd++){ if(dafState(ms,dd,byKey(ms+'/'+dd))==='learned') done++; }
        var bh=S.first?behind():[], pt=tile(bh.length?'hot':'','/'+ms+'/#map','📖','מסכת '+m.he,done+' / '+tot,bh.length?'מאחר ב־'+bh.length+(bh.length===1?' דף':' דפים')+' · להשלים':(S.first?'✓ במסלול':'כל הדפים לפי פרקים'));
        var pb=el('span','pg-bar'), pf=el('i'); pf.style.width=Math.max(done?2:0,Math.round(100*done/tot))+'%'; pb.appendChild(pf); pt.appendChild(pb); g.appendChild(pt); }
      var ll=laterList(); if(ll.length){ var x=ll[0]; g.appendChild(tile('',url(x.p)+'#'+x.p.s+x.p.d+'-'+x.id,'🔖','ללמוד אחר כך',String(ll.length),x.p.h+' · סוגיה '+(x.i+1))); }
      if(dow(today())>=4&&dow(today())<=5&&S.first) g.appendChild(tile('','/review/?week','🗓','חזרה שבועית','10 שאלות','מהדפים של השבוע — לקראת שבת'));
      var mt=tile('mas',false,'📚','מסכתות'), mlist=el('span','tl-l');
      Object.keys(C.mas).sort(function(a,b){return C.mas[a].o-C.mas[b].o}).forEach(function(s){ var a=el('a',null,C.mas[s].he); a.href='/'+s+'/'; mlist.appendChild(a); });
      mt.appendChild(mlist); g.appendChild(mt);
      if(hw&&seen) g.appendChild(howTile());
      if(HD.pages) g.appendChild(tile('','/stats/','📊','באתר',HD.pages+' דפים',HD.mas+' מסכתות · '+HD.steps.toLocaleString('he-IL')+' שלבי סוגיה'));
      if(HD.aids) g.appendChild(tile('','/aids/','🧩','עזרים',HD.aids.toLocaleString('he-IL'),'איורים, טבלאות, חשבונות ו־Simon Wolf — עם סינון'));
      if(HD.wn) g.appendChild(tile('','/changes/','✨','מה חדש · '+HD.wn.d,null,HD.wn.x+'…'));
      var gb=tile('',null,'⚙','קצב והגדרות',null,S.pace.mode==='plan'?'לפי קצב אישי':'לפי הדף היומי'); gb.setAttribute('aria-expanded','false'); g.appendChild(gb);
      if(window.__fbTile) g.appendChild(window.__fbTile);
      home.appendChild(g);
      var sp=settings(); sp.hidden=true; sp.classList.add('prefs');
      gb.onclick=function(){sp.hidden=!sp.hidden; gb.setAttribute('aria-expanded',!sp.hidden); if(!sp.hidden) sp.scrollIntoView({block:'nearest',behavior:'smooth'})};
      home.appendChild(sp);
    }
    painters.push(paintHome); paintHome.w=home; syncEls.push(paintHome); paintHome();
  }

  /* ---------- masechet page: summary + what matters now; all dapim by perek in a dialog ---------- */
  var mas=document.getElementById('progress-mas');
  if(mas&&C.mas[mas.dataset.slug]){
    var slug=mas.dataset.slug, M=C.mas[slug], dlg=null;
    function pubMap(){var o={}; L.forEach(function(p){if(p.s===slug) o[p.d]=p}); return o}
    function openMap(){
      var pub=pubMap(), t=plan().today;
      if(!dlg){ dlg=el('dialog','pg-dlg'); dlg.setAttribute('aria-label','כל הדפים לפי פרקים'); document.body.appendChild(dlg);
        dlg.addEventListener('click',function(e){ if(e.target===dlg) dlg.close(); }); }
      dlg.innerHTML='';
      var hd=el('div','pg-dlg-h'); hd.appendChild(el('h2',null,'מסכת '+M.he+' · כל הדפים'));
      var x=el('button','btn','סגור'); x.type='button'; x.onclick=function(){dlg.close()}; hd.appendChild(x); dlg.appendChild(hd);
      var lg=el('p','pg-legend'); [['learned','נלמד'],['progress','נפתח']].forEach(function(q){var s=el('span'); s.append(ticks(q[0]),document.createTextNode(' '+q[1])); lg.appendChild(s)});
      var sb=el('span'); sb.innerHTML=BOOK; sb.className='pg-bk'; var sbw=el('span'); sbw.append(sb,document.createTextNode(' ללמוד אחר כך')); lg.appendChild(sbw); var stw=el('span'); stw.append(el('span','pg-star','★'),document.createTextNode(' 75%+ בשאלות החזרה')); lg.appendChild(stw); dlg.appendChild(lg);
      var per=M.p&&M.p.length?M.p:[['',M.first,M.last]], focus=null;
      per.forEach(function(r,ix){
        var det=el('details','pg-perek'), sm=el('summary'), done=0, tot=r[2]-r[1]+1, have=false;
        for(var d=r[1]; d<=r[2]; d++){ var p=pub[d], ds=dafState(slug,d,p); if(ds==='learned') done++; if(p&&(ds!=='learned'||(t&&t.k===p.k))) have=true; }
        sm.append(el('span','pg-pn','פרק '+heb(ix+1)+(r[0]?' · '+r[0]:'')), el('span','pg-pr',heb(r[1])+'–'+heb(r[2])+' · '+done+'/'+tot));
        var bar=el('span','pg-bar'), f=el('i'); f.style.width=Math.round(100*done/tot)+'%'; bar.appendChild(f); sm.appendChild(bar);
        det.appendChild(sm); var g=el('div','pg-chips');
        for(var d2=r[1]; d2<=r[2]; d2++){ var c=chip(pub[d2],d2,t,slug); g.appendChild(c); if(t&&pub[d2]===t) focus=c; }
        det.appendChild(g); if(have) det.open=true; dlg.appendChild(det);
      });
      if(!dlg.open){ if(dlg.showModal) dlg.showModal(); else dlg.setAttribute('open',''); }
      if(focus) focus.scrollIntoView({block:'center'});
    }
    function paintMas(){
      var pub=pubMap(), t=plan().today, tot=M.last-M.first+1, done=0, prog=0;
      for(var d=M.first; d<=M.last; d++){ var ds=dafState(slug,d,pub[d]); if(ds==='learned') done++; else if(ds==='progress') prog++; }
      mas.innerHTML=''; mas.className='pg-sum'; mas.id='progress-mas';
      mas.appendChild(el('p','pg-m',tot+' דפים במסכת · '+done+' נלמדו'+(prog?' · '+prog+' בתהליך':'')));
      var bar=el('span','pg-bar'), f=el('i'); f.style.width=Math.round(100*done/tot)+'%'; bar.appendChild(f); mas.appendChild(bar);
      /* the current perek: where today's daf is, else where the learner is, else the first perek with pages */
      var per=M.p&&M.p.length?M.p:[['',M.first,M.last]], focusD=null;
      if(t&&t.s===slug) focusD=t.d;
      if(focusD==null){ L.forEach(function(p){ if(p.s===slug&&dafState(slug,p.d,p)==='progress') focusD=p.d; }); }
      if(focusD==null){ var ld=0; for(var d3=M.first; d3<=M.last; d3++) if(dafState(slug,d3,pub[d3])==='learned') ld=d3; if(ld) focusD=Math.min(ld+1,M.last); }
      if(focusD==null){ var fp=L.filter(function(p){return p.s===slug})[0]; focusD=fp?fp.d:M.first; }
      var pi=0; for(var ix=0; ix<per.length; ix++){ if(focusD>=per[ix][1]&&focusD<=per[ix][2]){ pi=ix; break; } }
      var r=per[pi], box=el('div','pg-cur'), pd=0, pt=r[2]-r[1]+1;
      for(var d4=r[1]; d4<=r[2]; d4++) if(dafState(slug,d4,pub[d4])==='learned') pd++;
      var hdr=el('div','pg-cur-h'); hdr.append(el('b',null,'הפרק הנוכחי: פרק '+heb(pi+1)+(r[0]?' · '+r[0]:'')), el('span','pg-pr',heb(r[1])+'–'+heb(r[2])+' · '+pd+'/'+pt));
      var b2=el('span','pg-bar'), f2=el('i'); f2.style.width=Math.round(100*pd/pt)+'%'; b2.appendChild(f2);
      var g=el('div','pg-chips'); for(var d5=r[1]; d5<=r[2]; d5++) g.appendChild(chip(pub[d5],d5,t,slug));
      box.append(hdr,b2,g);
      if(L.some(function(p){return p.s===slug&&p.d>=r[1]&&p.d<=r[2]&&S.pages[p.k]})){ var pr=el('a','btn','חזרה על הפרק · שאלות מעורבות'); pr.href='/review/?perek='+slug+':'+pi; box.appendChild(pr); }
      mas.appendChild(box);
      laterList().filter(function(x){return x.p.s===slug}).slice(0,5).forEach(function(x){mas.appendChild(laterRow(x))});
      var ob=el('button','btn','כל הפרקים'); ob.type='button'; ob.onclick=openMap; mas.appendChild(ob);
      document.querySelectorAll('.cards a.card').forEach(function(a){ var mm=a.getAttribute('href').match(/(\d+)\/$/), p=mm&&pub[+mm[1]]; if(!p) return;
        var o=a.querySelector('.pg-mk'); if(o) o.remove(); var tk=ticks(stateOf(p)); if(!tk) return; var mk=el('span','pg-mk'); mk.appendChild(tk); a.querySelector('.top h3').appendChild(mk); });
      if(dlg&&dlg.open) openMap();
    }
    painters.push(paintMas); paintMas();
    if(location.hash==='#map') openMap();
  }
  /* ---------- review page ---------- */
  var RV=document.getElementById('review-app');
  if(RV){ bank().then(function(B){
    var qs=[], m=(location.search.match(/perek=([a-z-]+):(\d+)/)||[]), mode=m[1]?'perek':/week/.test(location.search)?'week':'due';
    if(mode==='week'){ document.getElementById('rv-title').textContent='חזרה שבועית';
      document.getElementById('rv-sub').textContent='שאלות מעורבות מהדפים שלמדתם בשבוע האחרון.';
      var wk=addDays(today(),-7), wpool=[];
      L.forEach(function(p){ var e=S.pages[p.k]; if(!e) return; var last=e.done||(e.quiz&&new Date(e.quiz.ts).toISOString().slice(0,10))||p.y;
        if(last&&last>=wk) (B[p.k]||[]).forEach(function(_,i){wpool.push({page:p.k,q:i})}); });
      qs=wpool.sort(function(){return Math.random()-.5}).slice(0,10); }
    if(mode==='perek'){ var M=C.mas[m[1]], r=M&&M.p&&M.p[+m[2]];
      if(r){ document.getElementById('rv-title').textContent='חזרה על פרק '+heb(+m[2]+1)+(r[0]?' · '+r[0]:'');
        document.getElementById('rv-sub').textContent='שאלות מעורבות מכל דפי הפרק שלמדתם.';
        var pool=[]; L.forEach(function(p){ if(p.s===m[1]&&p.d>=r[1]&&p.d<=r[2]&&S.pages[p.k]) (B[p.k]||[]).forEach(function(_,i){pool.push({page:p.k,q:i})}); });
        qs=pool.sort(function(){return Math.random()-.5}).slice(0,10); } }
    else if(mode==='due') qs=dueList().slice(0,RVN);
    var i=0, right=0;
    function next(){
      RV.innerHTML='';
      if(!qs.length){ RV.appendChild(el('p','pg-m',mode==='perek'?'עדיין אין דפים שלמדתם בפרק הזה.':mode==='week'?'לא נמצאו דפים שלמדתם בשבוע האחרון.':'✓ אין שאלות לחזרה היום. השאלות הבאות יחזרו לפי הלוח.'));
        var h=el('a','btn','לדף הבית'); h.href='/'; RV.appendChild(h); return; }
      if(i>=qs.length){ RV.appendChild(el('div','qsum','סיימתם: '+right+' מתוך '+qs.length+(mode==='due'?' · השאלות שטעיתם בהן יחזרו מחר, והשאר בעוד כמה ימים.':'')));
        var h2=el('a','btn','לדף הבית'); h2.href='/'; RV.appendChild(h2); return; }
      var it=qs[i], p=byKey(it.page), item=(B[it.page]||[])[it.q];
      if(!item){ if(mode==='due') S.review.splice(S.review.indexOf(it),1), save(); qs.splice(i,1); return next(); }
      RV.appendChild(el('p','pg-m',(i+1)+' מתוך '+qs.length+' · '+(p?p.h:'')));
      var w=el('div','qitem'); RV.appendChild(w);
      renderQ(w,item,p,function(ok){ if(ok) right++; if(mode==='due') grade(it,ok); else enqueue(it.page,it.q,ok);
        var nb=el('button','btn',i+1<qs.length?'לשאלה הבאה ←':'לסיכום'); nb.type='button'; nb.style.marginTop='12px'; nb.onclick=function(){i++; next(); window.scrollTo(0,0);}; w.appendChild(nb); nb.focus(); });
    }
    next();
  }); }
  (function(){ var t=today(), tm=addDays(t,1);
    document.querySelectorAll('.cards a.card').forEach(function(a){ var m=(a.getAttribute('href')||'').match(/([a-z-]+)\/(\d+)\/$/)||[], k=m[1]?m[1]+'/'+m[2]:null;
      if(!k&&mas){ var mm=(a.getAttribute('href')||'').match(/(\d+)\/$/); if(mm) k=mas.dataset.slug+'/'+mm[1]; }
      var p=k&&byKey(k); if(!p||S.pace.mode==='plan') return; var w=p.y===t?'היום':p.y===tm?'מחר':null;
      if(w){ var h=a.querySelector('.top h3'); if(h) h.appendChild(el('span','card-when',w)); } });
  })();
  window.addEventListener('storage',function(e){ if(e.key===KEY){ try{S=norm(JSON.parse(e.newValue||'null'))}catch(x){} if(P) E=entry(P.k); refresh(); } });
})();

/* handled reader notes: a one-time toast for the reader's own notes, and recent fixes on Home */
(function(){
  var C={pages:[]}; try{C=JSON.parse(document.getElementById('catalog').textContent)}catch(e){}
  function name(p){var x=(C.pages||[]).filter(function(q){return q.k===p})[0]; return x?x.h:p}
  function link(n){var a=n.page.split('/'); return '/'+n.page+'/'+(n.section?'#'+a[0]+a[1]+'-'+n.section:'')}
  function el(t,c,txt){var e=document.createElement(t); if(c) e.className=c; if(txt!=null) e.textContent=txt; return e}
  function get(k,d){try{return JSON.parse(localStorage.getItem(k)||'null')||d}catch(e){return d}}
  function put(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
  var ST={fixed:'טופלה',feature:'נרשמה כהצעה לשיפור',rejected:'נבדקה — לא נדרש שינוי','needs-info':'נדרש פירוט נוסף','in-progress':'בטיפול'};

  /* 1. my notes → toast once per status change (checked at most every 3 hours) */
  var mine=get('daf-fb-notes',[]), seen=get('daf-fb-seen',{});
  if(mine.length && Date.now()-(seen._t||0)>3*3600e3){
    fetch('/api/feedback/status?n='+mine.slice(-30).map(function(n){return n.id+'.'+n.token}).join(',')).then(function(r){return r.json()}).then(function(j){
      seen._t=Date.now();
      var ch=(j.notes||[]).filter(function(n){return n.status!=='new' && seen[n.id]!==n.status});
      ch.forEach(function(n){seen[n.id]=n.status}); put('daf-fb-seen',seen);
      if(!ch.length) return;
      var t=el('div','pg-toast fb-toast'); t.setAttribute('role','status');
      var n=ch[0], msg=ch.length>1?ch.length+' מההערות ששלחת עודכנו':'ההערה שלך על '+name(n.page)+': '+(ST[n.status]||n.status)+(n.reply?' — '+n.reply:'');
      var s=el('span',null,msg), a=el('a',null,'פרטים'); a.href=ch.length>1?'/feedback/':link(n);
      var x=el('button',null,'×'); x.type='button'; x.setAttribute('aria-label','סגור'); x.onclick=function(){t.remove()};
      t.append(s,a,x); document.body.appendChild(t); setTimeout(function(){t.remove()},15000);
    }).catch(function(){});
  }

  /* 2. Home: recent fixes after reader notes */
  var home=document.getElementById('progress-home');
  if(home) fetch('/api/feedback/recent').then(function(r){return r.json()}).then(function(j){
    var ns=(j.notes||[]).slice(0,3); if(!ns.length) return;
    var box=el('div','fb-recent'); box.append(el('div','fb-recent-h','תוקן בעקבות הערות קוראים'));
    var ul=el('ul'); ns.forEach(function(n){var li=el('li'), a=el('a',null,name(n.page)+(n.section_title?' · '+n.section_title:'')); a.href=link(n); li.append(a); if(n.reply) li.append(el('span',null,' — '+n.reply)); ul.append(li)});
    box.append(ul); box.className='tl fb-recent'; window.__fbTile=box; var tl=home.querySelector('.tiles'); if(tl) tl.appendChild(box); else home.after(box);
  }).catch(function(){});
})();

/* anonymous daily visitor count (random id in this browser only; /api/stats) + /stats/ page */
(function(){
  function el(t,c,txt){var e=document.createElement(t); if(c) e.className=c; if(txt!=null) e.textContent=txt; return e}
  try{
    var q=new URLSearchParams(location.search).get('nostats');
    if(q==='1') localStorage.setItem('daf-nostats','1'); else if(q==='0') localStorage.removeItem('daf-nostats');
    if(!navigator.webdriver && !localStorage.getItem('daf-nostats') && navigator.sendBeacon){
      var v=localStorage.getItem('daf-vid');
      if(!/^[0-9a-f]{16,32}$/.test(v||'')){ var a=new Uint8Array(12); crypto.getRandomValues(a); v=[].map.call(a,function(x){return ('0'+x.toString(16)).slice(-2)}).join(''); localStorage.setItem('daf-vid',v) }
      navigator.sendBeacon('/api/stats/hit', JSON.stringify({v:v,p:location.pathname}));
    }
  }catch(e){}
  var tu=document.getElementById('today-users'), app=document.getElementById('stats-app');
  if(!tu && !app) return;
  fetch('/api/stats').then(function(r){return r.json()}).then(function(j){
    if(!j.ok) throw 0;
    var days=j.days||[], last=days[days.length-1], t=(last&&last.day===j.today)?last:{users:0,users_il:0,views:0};
    if(tu){ tu.textContent=t.users+' לומדים היום'; tu.hidden=false }
    if(!app) return;
    app.innerHTML='';
    var tiles=el('div','st-tiles');
    function tile(k,n,sub){var d=el('div','st-tile'); d.append(el('div','st-k',k),el('div','st-n',String(n))); if(sub) d.append(el('div','st-s',sub)); tiles.append(d)}
    tile('היום',t.users,'מהם '+(t.users_il||0)+' מישראל · '+(t.views||0)+' צפיות');
    tile('7 ימים',j.week.n,'מהם '+(j.week.il||0)+' מישראל · '+(j.returning7||0)+' חזרו יותר מיום אחד');
    tile('30 ימים',j.month.n,'מהם '+(j.month.il||0)+' מישראל');
    app.append(tiles);
    // daily users, last 30 days (one series: bars in the accent colour, hover/tap shows the numbers)
    var map={}; days.forEach(function(d){map[d.day]=d});
    var list=[]; for(var i=29;i>=0;i--){var dt=new Date(Date.parse(j.today+'T12:00:00Z')-i*864e5).toISOString().slice(0,10); list.push(map[dt]||{day:dt,users:0,users_il:0,views:0})}
    var max=Math.max(1,Math.max.apply(null,list.map(function(d){return d.users})));
    var fig=el('figure','st-fig'); fig.append(el('figcaption','st-cap','לומדים ביום — 30 הימים האחרונים'));
    var ch=el('div','st-chart'); ch.setAttribute('role','img'); ch.setAttribute('aria-label','גרף לומדים ביום');
    var HINT='הצביעו על עמודה לפרטי היום'; var tip=el('div','st-tip',HINT);
    list.forEach(function(d){
      var c=el('button','st-col'); c.type='button';
      var b=el('span','st-bar'); b.style.height=(d.users?Math.max(3,d.users/max*100):0)+'%'; c.append(b);
      var lbl=d.day.slice(8,10)+'/'+d.day.slice(5,7)+': '+d.users+' לומדים · '+(d.users_il||0)+' מישראל · '+(d.views||0)+' צפיות';
      c.setAttribute('aria-label',lbl);
      function show(){tip.textContent=lbl; ch.querySelectorAll('.on').forEach(function(x){x.classList.remove('on')}); c.classList.add('on')}
      c.addEventListener('mouseenter',show); c.addEventListener('focus',show); c.addEventListener('click',show);
      ch.append(c);
    });
    ch.addEventListener('mouseleave',function(){tip.textContent=HINT; ch.querySelectorAll('.on').forEach(function(x){x.classList.remove('on')})});
    var ax=el('div','st-ax'); ax.append(el('span',null,list[0].day.slice(8,10)+'/'+list[0].day.slice(5,7)),el('span',null,'היום'));
    fig.append(el('div','st-max','מקסימום '+max),ch,ax,tip); app.append(fig);
    // table view
    var det=el('details','st-tbl'); det.append(el('summary',null,'טבלה'));
    var tb=el('table'), hd=el('tr'); ['יום','לומדים','מישראל','צפיות'].forEach(function(h){hd.append(el('th',null,h))}); tb.append(hd);
    list.slice().reverse().filter(function(d){return d.users}).forEach(function(d){var tr=el('tr'); [d.day.slice(8,10)+'/'+d.day.slice(5,7),d.users,d.users_il||0,d.views||0].forEach(function(x){tr.append(el('td',null,String(x)))}); tb.append(tr)});
    det.append(tb); app.append(det);
  }).catch(function(){ if(app) app.innerHTML='<p class="pg-hint">הנתונים לא זמינים כרגע.</p>' });
})();
