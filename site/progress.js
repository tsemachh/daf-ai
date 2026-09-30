/* learner progress: sugya ✓, resume, streak, pace, export/import.
   Stored only in this browser (localStorage key "dafProgress"); nothing is sent to the server. */
(function(){
  var KEY='dafProgress', C={pages:[],mas:{}};
  try{C=JSON.parse(document.getElementById('catalog').textContent)}catch(e){}
  if(!C.pages) return;
  function blank(){return {v:1,pages:{},days:[],review:[],later:{},pace:{mode:'yomi'},last:null,first:null}}
  function norm(s){if(!s||s.v!==1)return blank(); var b=blank(); for(var k in b) if(s[k]==null) s[k]=b[k]; return s}
  var S; try{S=norm(JSON.parse(localStorage.getItem(KEY)||'null'))}catch(e){S=blank()}
  function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}

  /* ---------- helpers ---------- */
  function el(t,c,txt){var e=document.createElement(t);if(c)e.className=c;if(txt!=null)e.textContent=txt;return e}
  function today(){try{return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jerusalem'}).format(new Date())}catch(e){return new Date().toISOString().slice(0,10)}}
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
  function behind(){var pl=plan(); return pl.due.filter(function(p){return p!==pl.today&&stateOf(p)!=='learned'})}  /* today's page is not 'behind' */

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
    var msg=el('p','pg-hint','ההתקדמות נשמרת רק בדפדפן הזה. טעינה ממזגת עם מה שכבר קיים כאן.');
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
  }

  var painters=[]; function refresh(){painters.forEach(function(f){f()})}

  /* ---------- daf page: tracking is passive — a sugya viewed long enough counts as learned ---------- */
  var art=document.querySelector('article.daf'), P=art&&byKey(location.pathname.replace(/^\/|\/$/g,''));
  var E=null;
  if(art&&P){
    var pre=art.id+'-', secs={}, navA={}, laterB={}; E=entry(P.k);
    var pn=art.querySelector('.prefs'); if(pn) pn.appendChild(settings());
    art.querySelectorAll('nav.map a[href^="#"]').forEach(function(a){ navA[a.getAttribute('href').slice(1+pre.length)]=a; });
    P.n.forEach(function(id){
      var sec=document.getElementById(pre+id); if(!sec) return; secs[id]=sec;
      var h3=sec.querySelector('h3'); if(!h3) return;
      var b=el('button','fb-sec pg-later'); b.type='button';
      b.onclick=function(){ var k=P.k+'#'+id; if(S.later[k]) delete S.later[k]; else {S.later[k]=Date.now(); touch();} save(); paint(); };
      b.innerHTML=BOOK; var fb=h3.querySelector('.fb-sec'); if(fb) fb.after(b); else h3.insertBefore(b,h3.firstChild); laterB[id]=b;
    });
    function paint(){
      var ab=art.querySelector('.controls [data-role="learned"]');
      if(ab){ var all=nLearned(P)===P.n.length; ab.setAttribute('aria-pressed',all); ab.innerHTML=''; if(all) ab.appendChild(ticks('learned')); ab.appendChild(document.createTextNode((all?' ':'')+'למדתי'));
        ab.title=all?'כל הסוגיות סומנו כנלמדו — הקש לביטול':'סמן את כל הסוגיות בדף כנלמדו'; }
      P.n.forEach(function(id){
        var on=!!S.later[P.k+'#'+id], b=laterB[id];
        if(b){ b.classList.toggle('on',on); b.setAttribute('aria-pressed',on); b.dataset.tip=on?'סומן ללמוד אחר כך — הקש לביטול':'ללמוד אחר כך'; b.setAttribute('aria-label',b.dataset.tip); }
        var a=navA[id]; if(!a) return; var o=a.querySelector('.pg-mk'); if(o) o.remove();
        var mk=el('span','pg-mk'), t=ticks(E.s[id]); if(t) mk.appendChild(t);
        if(on){ var bk=el('span','pg-bk'); bk.innerHTML=BOOK; bk.setAttribute('aria-label','ללמוד אחר כך'); mk.appendChild(bk); }
        if(mk.childNodes.length) a.appendChild(mk);
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
    setInterval(tick,1000);
    document.addEventListener('visibilitychange',function(){lastT=Date.now()});
    if('IntersectionObserver' in window){
      var io=new IntersectionObserver(function(es){es.forEach(function(en){
        if(!en.isIntersecting) return; cur=en.target.id.slice(pre.length);
        S.last={page:P.k,section:cur,ts:Date.now()}; save();
      })},{rootMargin:'-45% 0px -50% 0px'});
      Object.keys(secs).forEach(function(id){io.observe(secs[id])});
    }
    /* "למדתי" in the top bar: mark every sugya learned (press again to undo) */
    var allB=art.querySelector('.controls [data-role="learned"]');
    if(allB) allB.addEventListener('click',function(){
      var all=nLearned(P)===P.n.length;
      P.n.forEach(function(id){ if(all) E.s[id]='opened'; else { E.s[id]='learned'; delete S.later[P.k+'#'+id]; } });
      if(!all) markDay(); E.done=all?null:(E.done||today()); touch(); save(); paint();
    });
    /* quiz: best score + missed questions for later review (not needed for "learned") */
    var qb=art.querySelector('[data-role="quizBox"]');
    if(qb) qb.addEventListener('click',function(ev){ if(!ev.target.closest('.opt')) return; setTimeout(function(){
      var items=qb.querySelectorAll('.qitem'), done=qb.querySelectorAll('.qitem[data-done]'); if(!items.length||done.length<items.length) return;
      var right=0; items.forEach(function(q,i){ var ok=!q.querySelector('.opt.wrong'); if(ok) right++;
        S.review=S.review.filter(function(r){return !(r.page===P.k&&r.q===i&&ok)});
        if(!ok&&!S.review.some(function(r){return r.page===P.k&&r.q===i})) S.review.push({page:P.k,q:i,due:addDays(today(),1),n:0});
      });
      if(!E.quiz||right>E.quiz.best) E.quiz={best:right,of:items.length,ts:Date.now()}; touch(); save();
    },0)});
    paint();
  }

  /* ---------- shared: a daf chip with its ticks ---------- */
  function chip(p,d,t){
    var st=p?stateOf(p):'na', c=el(p?'a':'span','pg-chip '+st+(p&&t&&t.k===p.k?' today':''));
    c.appendChild(el('span','pg-n',heb(d)));
    if(p){ c.href=url(p); var tk=ticks(st); if(tk) c.appendChild(tk); if(laterIn(p).length){var bk=el('span','pg-bk'); bk.innerHTML=BOOK; c.appendChild(bk);}
      c.setAttribute('aria-label',p.h+(st==='learned'?' · נלמד':st==='progress'?' · בתהליך':'')); }
    else c.title='דף '+heb(d)+' — עוד לא באתר';
    return c;
  }
  function laterList(){ return Object.keys(S.later).sort(function(a,b){return S.later[a]-S.later[b]}).map(function(k){
    var a=k.split('#'), p=byKey(a[0]); if(!p) return null; var i=p.n.indexOf(a[1]); return i<0?null:{p:p,id:a[1],i:i}; }).filter(Boolean); }
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
        var c=nLearned(tp); card.appendChild(el('div','pg-m',tp.n.length+' סוגיות'+(c&&c<tp.n.length?' · '+c+' נלמדו':''))); }
      else card.appendChild(el('div','pg-t',pl.beyond?'הדף הבא עוד לא פורסם באתר — מתעדכן כל לילה':'אין דף לימוד להיום'));
      home.appendChild(card);
      var side=el('div','pg-side');
      if(S.last){ var lp=byKey(S.last.page); if(lp){ var i=lp.n.indexOf(S.last.section), a=el('a','pg-resume-b');
        a.href=url(lp)+(i>0?'#'+lp.s+lp.d+'-'+S.last.section:''); a.append(el('b',null,'↩ המשך מהמקום שעצרת'),el('span',null,lp.h+(i>=0?' · סוגיה '+(i+1):''))); side.appendChild(a); } }
      if(S.first){ var bh=behind(), st=el('p','pg-status');
        if(!bh.length) st.append(el('span','pg-ok','✓'),document.createTextNode(' במסלול'));
        else { st.append(el('span','pg-warn','●'),document.createTextNode(' מאחר ב־'+bh.length+(bh.length===1?' דף · ':' דפים · '))); var go=el('a',null,'השלם את '+bh[0].h); go.href=url(bh[0]); st.appendChild(go); }
        side.appendChild(st); }
      var sk=streak(); if(sk>0) side.appendChild(el('p','pg-streak','🔥 '+sk+(sk===1?' יום':' ימים')+' ברצף'));
      var ll=laterList(); if(ll.length){ var lw=el('div','pg-laterbox'); lw.appendChild(el('b',null,'ללמוד אחר כך ('+ll.length+')')); ll.slice(0,3).forEach(function(x){lw.appendChild(laterRow(x))}); side.appendChild(lw); }
      Object.keys(C.mas).forEach(function(slug){ var m=C.mas[slug], tot=m.last-m.first+1,
        done=L.filter(function(p){return p.s===slug&&stateOf(p)==='learned'}).length; if(!done&&!S.first) return;
        var w=el('a','pg-mas'); w.href='/'+slug+'/#map'; w.appendChild(el('span',null,'מסכת '+m.he+' · '+done+' מתוך '+tot+' דפים'));
        var bar=el('span','pg-bar'), f=el('i'); f.style.width=Math.max(done?2:0,Math.round(100*done/tot))+'%'; bar.appendChild(f); w.appendChild(bar); side.appendChild(w); });
      var gb=el('button','btn pg-gear','⚙ קצב וגיבוי'); gb.type='button'; gb.setAttribute('aria-expanded','false');
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
      var sb=el('span'); sb.innerHTML=BOOK; sb.className='pg-bk'; var sbw=el('span'); sbw.append(sb,document.createTextNode(' ללמוד אחר כך')); lg.appendChild(sbw); dlg.appendChild(lg);
      var per=M.p&&M.p.length?M.p:[['',M.first,M.last]], focus=null;
      per.forEach(function(r,ix){
        var det=el('details','pg-perek'), sm=el('summary'), done=0, tot=r[2]-r[1]+1, have=false;
        for(var d=r[1]; d<=r[2]; d++){ var p=pub[d]; if(p&&stateOf(p)==='learned') done++; if(p&&(stateOf(p)!=='learned'||(t&&t.k===p.k))) have=true; }
        sm.append(el('span','pg-pn','פרק '+heb(ix+1)+(r[0]?' · '+r[0]:'')), el('span','pg-pr',heb(r[1])+'–'+heb(r[2])+' · '+done+'/'+tot));
        var bar=el('span','pg-bar'), f=el('i'); f.style.width=Math.round(100*done/tot)+'%'; bar.appendChild(f); sm.appendChild(bar);
        det.appendChild(sm); var g=el('div','pg-chips');
        for(var d2=r[1]; d2<=r[2]; d2++){ var c=chip(pub[d2],d2,t); g.appendChild(c); if(t&&pub[d2]===t) focus=c; }
        det.appendChild(g); if(have) det.open=true; dlg.appendChild(det);
      });
      if(!dlg.open){ if(dlg.showModal) dlg.showModal(); else dlg.setAttribute('open',''); }
      if(focus) focus.scrollIntoView({block:'center'});
    }
    function paintMas(){
      var pub=pubMap(), t=plan().today, tot=M.last-M.first+1, done=0, prog=0;
      Object.keys(pub).forEach(function(d){var s=stateOf(pub[d]); if(s==='learned') done++; else if(s==='progress') prog++;});
      mas.innerHTML=''; mas.className='pg-sum'; mas.id='progress-mas';
      mas.appendChild(el('p','pg-m',tot+' דפים במסכת · '+done+' נלמדו · '+prog+' בתהליך'));
      var bar=el('span','pg-bar'), f=el('i'); f.style.width=Math.round(100*done/tot)+'%'; bar.appendChild(f); mas.appendChild(bar);
      /* what matters now: in progress, today's, the next few not started */
      var now=[]; L.forEach(function(p){ if(p.s===slug&&stateOf(p)==='progress') now.push(p); });
      if(t&&t.s===slug&&now.indexOf(t)<0&&stateOf(t)!=='learned') now.push(t);
      var lastDone=0; L.forEach(function(p){ if(p.s===slug&&stateOf(p)==='learned') lastDone=Math.max(lastDone,p.d); });
      L.filter(function(p){return p.s===slug&&stateOf(p)==='new'&&p.d>lastDone&&now.indexOf(p)<0}).slice(0,3).forEach(function(p){now.push(p)});
      now.sort(function(a,b){return a.d-b.d});
      if(now.length){ var row=el('div','pg-chips'); now.forEach(function(p){row.appendChild(chip(p,p.d,t))}); mas.appendChild(row); }
      laterList().filter(function(x){return x.p.s===slug}).slice(0,5).forEach(function(x){mas.appendChild(laterRow(x))});
      var ob=el('button','btn','כל הדפים לפי פרקים'); ob.type='button'; ob.onclick=openMap; mas.appendChild(ob);
      document.querySelectorAll('.cards a.card').forEach(function(a){ var mm=a.getAttribute('href').match(/(\d+)\/$/), p=mm&&pub[+mm[1]]; if(!p) return;
        var o=a.querySelector('.pg-mk'); if(o) o.remove(); var tk=ticks(stateOf(p)); if(!tk) return; var mk=el('span','pg-mk'); mk.appendChild(tk); a.querySelector('.top h3').appendChild(mk); });
      if(dlg&&dlg.open) openMap();
    }
    painters.push(paintMas); paintMas();
    if(location.hash==='#map') openMap();
  }
  window.addEventListener('storage',function(e){ if(e.key===KEY){ try{S=norm(JSON.parse(e.newValue||'null'))}catch(x){} if(P) E=entry(P.k); refresh(); } });
})();
