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

  /* ---------- helpers ---------- */
  function el(t,c,txt){var e=document.createElement(t);if(c)e.className=c;if(txt!=null)e.textContent=txt;return e}
  var TF=null, TC={t:0,v:''}; function today(){var n=Date.now(); if(n-TC.t<60000) return TC.v; try{TF=TF||new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jerusalem'}); TC.v=TF.format(new Date())}catch(e){TC.v=new Date().toISOString().slice(0,10)} TC.t=n; return TC.v}
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

    box.appendChild(el('div','prefs-h','סנכרון בין מכשירים'));
    box.appendChild(syncBox());
    box.appendChild(el('div','prefs-h','גיבוי והעברה למכשיר אחר'));
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
    row.append(dl,cp,fl,ip); box.append(row,ta,msg);
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
  var syncEls=[], pushT=null, gsi=null;
  function api(u,o){return fetch(u,Object.assign({credentials:'same-origin'},o||{})).then(function(r){return r.json().catch(function(){return {}})})}
  SY.push=function(){clearTimeout(pushT); pushT=setTimeout(function(){
    api('/api/progress',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({data:S})}).then(function(j){ if(j&&j.error==='signed_out'){SY.user=null;paintSync()} });
  },2500)};
  function pull(){ return api('/api/progress').then(function(j){
    if(j&&j.ok&&j.data&&j.data.v===1){ merge(norm(j.data)); try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){} refresh(); }
    if(j&&j.ok) SY.push();
  }); }
  function paintSync(){ syncEls=syncEls.filter(function(f){return f.w.isConnected}); syncEls.forEach(function(f){f()}) }
  function loadGsi(){ return gsi||(gsi=new Promise(function(res){
    if(window.google&&google.accounts) return res(true);
    var sc=document.createElement('script'); sc.src='https://accounts.google.com/gsi/client'; sc.async=true;
    sc.onload=function(){res(true)}; sc.onerror=function(){res(false)}; document.head.appendChild(sc);
  })) }
  var AC=null; function authCfg(){return AC||(AC=api('/api/auth/config'))}
  function syncBox(){
    var wrap=el('div','pg-sync');
    function paint(){
      wrap.innerHTML='';
      if(SY.user){
        wrap.append(el('p','pg-hint','מחובר'+(SY.user.name?' כ־'+SY.user.name:'')+(SY.user.email?' ('+SY.user.email+')':'')+'. ההתקדמות נשמרת גם בחשבון ומתעדכנת בכל מכשיר שבו תתחברו.'));
        var out=el('button','btn','התנתקות'); out.type='button';
        out.onclick=function(){api('/api/auth/logout',{method:'POST'}).then(function(){SY.user=null; try{google.accounts.id.disableAutoSelect()}catch(e){} paintSync()})};
        wrap.append(out); return;
      }
      wrap.append(el('p','pg-hint','התחברו כדי להמשיך מאותה נקודה בכל מכשיר — במחשב ובנייד. ההתקדמות שכבר יש בדפדפן הזה תצורף לחשבון.'));
      var pv=el('a','pg-hint','מה נשמר? מדיניות הפרטיות'); pv.href='/privacy/'; wrap.append(pv);
      var slot=el('div','pg-gbtn'); wrap.append(slot);
      authCfg().then(function(c){
        if(!c||!c.google){slot.append(el('p','pg-hint','הכניסה עדיין לא הוגדרה.')); return}
        loadGsi().then(function(ok){
          if(!ok){slot.append(el('p','pg-hint','לא ניתן לטעון את כפתור Google כרגע.')); return}
          google.accounts.id.initialize({client_id:c.google, ux_mode:'popup', auto_select:false, callback:function(r){
            api('/api/auth/google',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({credential:r.credential})}).then(function(j){
              if(j&&j.ok){SY.user=j.user; paintSync(); pull()} else slot.append(el('p','pg-hint','הכניסה נכשלה. נסו שוב.'));
            });
          }});
          google.accounts.id.renderButton(slot,{theme:'outline',size:'large',shape:'pill',text:'signin_with',locale:'he'});
        });
      });
    }
    paint.w=wrap; syncEls.push(paint); paint(); return wrap;
  }
  api('/api/auth/me').then(function(j){ if(j&&j.user){SY.user=j.user; paintSync(); pull()} }).catch(function(){});
  var toastEl=null, toastT=null;
  function toast(msg,undo){
    if(!toastEl){toastEl=el('div','pg-toast'); toastEl.setAttribute('role','status'); toastEl.setAttribute('aria-live','polite'); document.body.appendChild(toastEl);}
    toastEl.innerHTML=''; toastEl.appendChild(el('span',null,msg));
    if(undo){var u=el('button',null,'בטל'); u.type='button'; u.onclick=function(){undo(); toastEl.hidden=true;}; toastEl.appendChild(u);}
    toastEl.hidden=false; clearTimeout(toastT); toastT=setTimeout(function(){toastEl.hidden=true},5000);
  }

  /* ---------- daf page: tracking is passive — a sugya viewed long enough counts as learned ---------- */
  var art=document.querySelector('article.daf'), P=art&&byKey(location.pathname.replace(/^\/|\/$/g,''));
  var E=null;
  if(art&&P){
    var RM=/(^|[?&])r(=|&|$)/.test(location.search.slice(1));   /* ?r = חזרה: summaries, verdicts and the summary table only */
    var firstVisit=!S.pages[P.k], pre=art.id+'-', secs={}, navA={}, laterB={}; E=entry(P.k);
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
    });
    function paint(){
      var ab=art.querySelector('.controls [data-role="learned"]');
      if(ab&&ab.dataset.all!==String(nLearned(P)===P.n.length)){ var all=nLearned(P)===P.n.length; ab.dataset.all=String(all); ab.setAttribute('aria-pressed',all); ab.innerHTML=''; if(all) ab.appendChild(ticks('learned')); ab.appendChild(document.createTextNode((all?' ':'')+'למדתי'));
        ab.title=all?'כל הסוגיות סומנו כנלמדו — הקש לביטול':'סמן את כל הסוגיות בדף כנלמדו'; }
      P.n.forEach(function(id){
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
      if(ch){ E.done=nLearned(P)===P.n.length?(E.done||today()):null; touch(); save(); paint(); }
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
      if(!all) markDay(); E.done=all?null:(E.done||today()); touch(); save(); paint();
      toast(all?'הסימון בוטל':'סומנו '+P.n.length+' סוגיות כנלמדו',function(){ var o=JSON.parse(snap); E.s=o.s; E.done=o.done; S.later=o.later; save(); paint(); });
    });
    /* quiz: best score + missed questions for later review (not needed for "learned") */
    var qb=art.querySelector('[data-role="quizBox"]');
    if(qb) qb.addEventListener('click',function(ev){ if(!ev.target.closest('.opt')) return; setTimeout(function(){
      var items=qb.querySelectorAll('.qitem'), done=qb.querySelectorAll('.qitem[data-done]'); if(!items.length||done.length<items.length) return;
      var right=0, spare=2; items.forEach(function(q,i){ var ok=!q.querySelector('.opt.wrong'); if(ok) right++;
        var inQ=S.review.some(function(r){return r.page===P.k&&r.q===i});
        if(!ok&&!inQ) S.review.push({page:P.k,q:i,due:addDays(today(),1),n:0});
        else if(ok&&!inQ&&spare>0){ spare--; S.review.push({page:P.k,q:i,due:addDays(today(),3),n:1}); }  /* a couple of correct ones come back too */
      });
      if(!E.quiz||right>E.quiz.best) E.quiz={best:right,of:items.length,ts:Date.now()}; touch(); save();
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

  /* ---------- home ---------- */
  var home=document.getElementById('progress-home');
  if(home){
    function paintHome(){
      home.innerHTML=''; home.className='pg-home';
      var pl=plan(), tp=pl.today, card=el('a','pg-today');
      card.appendChild(el('div','pg-k',S.pace.mode==='plan'?'לפי הקצב שלך — היום':'הדף היומי — היום'));
      if(tp){ card.href=url(tp); var hh=el('div','pg-h',tp.h+' '); var tk=ticks(stateOf(tp)); if(tk) hh.appendChild(tk); card.appendChild(hh); card.appendChild(el('div','pg-t',tp.t));
        var c=nLearned(tp), qz=S.pages[tp.k]&&S.pages[tp.k].quiz; card.appendChild(el('div','pg-m',tp.n.length+' סוגיות'+(c&&c<tp.n.length?' · '+c+' נלמדו':'')+(qz?' · חזרה '+qz.best+'/'+qz.of:''))); }
      else card.appendChild(el('div','pg-t',pl.beyond?'הדף הבא עוד לא פורסם באתר — מתעדכן כל לילה':'אין דף להיום'));
      home.appendChild(card);
      var side=el('div','pg-side');
      if(S.first||S.review.length){ var dl=dueList(), rc=el('a','pg-review'); rc.href='/review/';
        if(dl.length){ rc.append(el('b',null,'חזרה היום · '+dl.length+(dl.length===1?' שאלה':' שאלות')), el('span',null,'כ־'+Math.max(1,Math.round(dl.length*0.4))+' דק׳ · לפני הדף החדש')); }
        else { rc.classList.add('done'); rc.append(el('b',null,'✓ אין חזרות להיום'), el('span',null,'השאלות הבאות יחזרו לפי הלוח')); }
        side.appendChild(rc);
        if(dow(today())>=4&&dow(today())<=5){ var wr=el('a','pg-review done'); wr.href='/review/?week'; wr.append(el('b',null,'חזרה שבועית לקראת שבת'), el('span',null,'10 שאלות מעורבות מהדפים של השבוע')); side.appendChild(wr); } }
      if(S.last){ var lp=byKey(S.last.page); if(lp){ var i=lp.n.indexOf(S.last.section), a=el('a','pg-resume-b');
        a.href=url(lp)+(i>0?'#'+lp.s+lp.d+'-'+S.last.section:''); a.append(el('b',null,'↩ המשך מהמקום שעצרת'),el('span',null,lp.h+(i>=0?' · סוגיה '+(i+1):''))); side.appendChild(a); } }
      if(S.first){ var bh=behind(), st=el('p','pg-status');
        if(!bh.length) st.append(el('span','pg-ok','✓'),document.createTextNode(' במסלול'));
        else { st.append(el('span','pg-warn','●'),document.createTextNode(' מאחר ב־'+bh.length+(bh.length===1?' דף · ':' דפים · '))); var go=el('a',null,'השלם את '+bh[0].h); go.href=url(bh[0]); st.appendChild(go); }
        side.appendChild(st); }
      var sk=streak(); if(sk>0) side.appendChild(el('p','pg-streak','🔥 '+sk+(sk===1?' יום':' ימים')+' ברצף'));
      var ll=laterList(); if(ll.length){ var lw=el('div','pg-laterbox'); lw.appendChild(el('b',null,'ללמוד אחר כך ('+ll.length+')')); ll.slice(0,3).forEach(function(x){lw.appendChild(laterRow(x))}); side.appendChild(lw); }
      Object.keys(C.mas).forEach(function(slug){ var m=C.mas[slug], tot=m.last-m.first+1,
        done=0; for(var dd=m.first; dd<=m.last; dd++){ var pp=byKey(slug+'/'+dd); if(dafState(slug,dd,pp)==='learned') done++; } if(!done&&!S.first) return;
        var w=el('a','pg-mas'); w.href='/'+slug+'/#map'; w.appendChild(el('span',null,'מסכת '+m.he+' · '+done+' מתוך '+tot+' דפים'));
        var bar=el('span','pg-bar'), f=el('i'); f.style.width=Math.max(done?2:0,Math.round(100*done/tot))+'%'; bar.appendChild(f); w.appendChild(bar); side.appendChild(w); });
      var gb=el('button','btn pg-gear','⚙ קצב, גיבוי וכניסה'); gb.type='button'; gb.setAttribute('aria-expanded','false');
      var sp=settings(); sp.hidden=true; sp.classList.add('prefs');
      gb.onclick=function(){sp.hidden=!sp.hidden; gb.setAttribute('aria-expanded',!sp.hidden)};
      side.appendChild(gb); home.append(side,sp);
    }
    painters.push(paintHome); paintHome();
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
    else if(mode==='due') qs=dueList().slice(0,12);
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
    box.append(ul); var al=document.querySelector('#home .about-link'); if(al) al.before(box); else home.after(box);
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
