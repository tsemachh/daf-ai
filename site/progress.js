/* learner progress: sugya ✓, resume, streak, pace, export/import.
   Stored only in this browser (localStorage key "dafProgress"); nothing is sent to the server. */
(function(){
  var KEY='dafProgress', C={pages:[],mas:{}};
  try{C=JSON.parse(document.getElementById('catalog').textContent)}catch(e){}
  if(!C.pages) return;
  function blank(){return {v:1,pages:{},days:[],review:[],pace:{mode:'yomi'},last:null,first:null}}
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
  function stateOf(p){var c=nLearned(p); if(p.n.length&&c===p.n.length) return 'learned'; var e=S.pages[p.k]; return e&&Object.keys(e.s).length?'progress':'new'}
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
  }

  var painters=[]; function refresh(){painters.forEach(function(f){f()})}

  /* ---------- daf page ---------- */
  var art=document.querySelector('article.daf'), P=art&&byKey(location.pathname.replace(/^\/|\/$/g,''));
  if(art&&P){
    var pre=art.id+'-', E=entry(P.k), secs={}, learnBtn={}, dots={};
    var strip=el('div','pg-strip'); strip.setAttribute('aria-label','התקדמות בדף');
    var dl=el('div','pg-dots'), cnt=el('span','pg-count'), res=el('a','pg-resume');
    P.n.forEach(function(id,i){
      var sec=document.getElementById(pre+id); if(!sec) return; secs[id]=sec;
      var d=el('button','pg-dot'); d.type='button'; d.setAttribute('aria-label','סוגיה '+(i+1)); d.title='סוגיה '+(i+1);
      d.onclick=function(){sec.scrollIntoView({behavior:'smooth',block:'start'})}; dl.appendChild(d); dots[id]=d;
      var b=el('button','pg-learn'); b.type='button';
      b.onclick=function(){
        var on=E.s[id]!=='learned'; E.s[id]=on?'learned':'opened'; touch(); if(on) markDay();
        E.done=nLearned(P)===P.n.length?(E.done||today()):null; save(); paint();
      };
      sec.appendChild(b); learnBtn[id]=b;
    });
    strip.append(dl,cnt,res);
    var mapNav=art.querySelector('nav.map'); if(mapNav) mapNav.before(strip); else art.querySelector('header').after(strip);
    var pn=art.querySelector('.prefs'); if(pn) pn.appendChild(settings());
    function paint(){
      var c=0;
      P.n.forEach(function(id){ var st=E.s[id]||''; if(st==='learned') c++;
        if(dots[id]) dots[id].className='pg-dot'+(st?' '+st:'')+(id===curId?' cur':'');
        if(learnBtn[id]){ learnBtn[id].textContent=st==='learned'?'✓ למדתי — לחצו לביטול':'✓ למדתי'; learnBtn[id].classList.toggle('on',st==='learned'); learnBtn[id].setAttribute('aria-pressed',st==='learned'); }
      });
      cnt.textContent=c===P.n.length?'✓ הדף נלמד':c+' מתוך '+P.n.length+' סוגיות';
    }
    painters.push(paint);
    /* resume link */
    if(S.last&&S.last.page===P.k&&!location.hash){ var i=P.n.indexOf(S.last.section);
      if(i>0){ res.textContent='↩ המשך מסוגיה '+(i+1); res.href='#'+pre+S.last.section; } }
    /* opened: sugya crosses the middle of the screen for 20s; remember position */
    var curId=null, timer=null;
    if('IntersectionObserver' in window){
      var io=new IntersectionObserver(function(es){es.forEach(function(en){
        if(!en.isIntersecting) return; var id=en.target.id.slice(pre.length); curId=id;
        S.last={page:P.k,section:id,ts:Date.now()}; touch(); save(); paint();
        clearTimeout(timer); timer=setTimeout(function(){ if(curId===id&&!E.s[id]){E.s[id]='opened'; save(); paint();} },20000);
      })},{rootMargin:'-45% 0px -50% 0px'});
      Object.keys(secs).forEach(function(id){io.observe(secs[id])});
    }
    /* quiz: best score + missed questions for later review */
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

  /* ---------- home ---------- */
  var home=document.getElementById('progress-home');
  if(home){
    function paintHome(){
      home.innerHTML=''; home.className='pg-home';
      var pl=plan(), tp=pl.today, card=el('a','pg-today');
      card.appendChild(el('div','pg-k',S.pace.mode==='plan'?'לפי הקצב שלך — היום':'הדף היומי — היום'));
      if(tp){ card.href=url(tp); card.appendChild(el('div','pg-h',tp.h)); card.appendChild(el('div','pg-t',tp.t));
        var c=nLearned(tp); card.appendChild(el('div','pg-m',tp.n.length+' סוגיות'+(c?' · '+c+' נלמדו':'')+(stateOf(tp)==='learned'?' · ✓ נלמד':''))); }
      else { card.removeAttribute('href'); card.appendChild(el('div','pg-t',pl.beyond?'הדף הבא עוד לא פורסם באתר — מתעדכן כל לילה':'אין דף לימוד להיום')); }
      home.appendChild(card);
      var side=el('div','pg-side');
      if(S.last){ var lp=byKey(S.last.page); if(lp){ var i=lp.n.indexOf(S.last.section), a=el('a','pg-resume-b');
        a.href=url(lp)+(i>0?'#'+lp.s+lp.d+'-'+S.last.section:''); a.append(el('b',null,'↩ המשך מהמקום שעצרת'),el('span',null,lp.h+(i>=0?' · סוגיה '+(i+1):''))); side.appendChild(a); } }
      if(S.first){ var bh=behind(), st=el('p','pg-status');
        if(!bh.length) st.append(el('span','pg-ok','✓'),document.createTextNode(' במסלול'));
        else { st.append(el('span','pg-warn','●'),document.createTextNode(' מאחר ב־'+bh.length+(bh.length===1?' דף · ':' דפים · '))); var go=el('a',null,'השלם את '+bh[0].h); go.href=url(bh[0]); st.appendChild(go); }
        side.appendChild(st); }
      var sk=streak(); if(sk>0) side.appendChild(el('p','pg-streak','🔥 '+sk+(sk===1?' יום':' ימים')+' ברצף'));
      Object.keys(C.mas).forEach(function(slug){ var m=C.mas[slug], tot=m.last-m.first+1,
        done=L.filter(function(p){return p.s===slug&&stateOf(p)==='learned'}).length; if(!done&&!S.first) return;
        var w=el('a','pg-mas'); w.href='/'+slug+'/'; w.appendChild(el('span',null,'מסכת '+m.he+' · '+done+' מתוך '+tot+' דפים'));
        var bar=el('span','pg-bar'), f=el('i'); f.style.width=Math.max(done?2:0,Math.round(100*done/tot))+'%'; bar.appendChild(f); w.appendChild(bar); side.appendChild(w); });
      var gb=el('button','btn pg-gear','⚙ קצב וגיבוי'); gb.type='button'; gb.setAttribute('aria-expanded','false');
      var sp=settings(); sp.hidden=true; sp.classList.add('prefs');
      gb.onclick=function(){sp.hidden=!sp.hidden; gb.setAttribute('aria-expanded',!sp.hidden)};
      side.appendChild(gb); home.append(side,sp);
    }
    painters.push(paintHome); paintHome();
  }

  /* ---------- masechet page ---------- */
  var mas=document.getElementById('progress-mas');
  if(mas&&C.mas[mas.dataset.slug]){
    function paintMas(){
      var slug=mas.dataset.slug, m=C.mas[slug], pub={}, t=plan().today;
      L.forEach(function(p){if(p.s===slug) pub[p.d]=p});
      mas.innerHTML=''; mas.className='pg-map';
      var done=0; for(var d=m.first; d<=m.last; d++) if(pub[d]&&stateOf(pub[d])==='learned') done++;
      var tot=m.last-m.first+1, hd=el('p','pg-m',done+' נלמדו מתוך '+tot+' דפים');
      var bar=el('span','pg-bar'), f=el('i'); f.style.width=Math.round(100*done/tot)+'%'; bar.appendChild(f);
      var g=el('div','pg-grid');
      for(var d=m.first; d<=m.last; d++){ var p=pub[d], c=el(p?'a':'span','pg-cell'+(p?' '+stateOf(p):' na')+(p&&t&&t.k===p.k?' today':''));
        c.title=p?p.h:'דף '+d+' — עוד לא באתר'; if(p){c.href=url(p); c.setAttribute('aria-label',p.h)} g.appendChild(c); }
      var lg=el('div','pg-legend'); [['learned','נלמד'],['progress','בתהליך'],['new','זמין'],['na','עוד לא באתר']].forEach(function(x){var s=el('span'); s.append(el('i','pg-cell '+x[0]),document.createTextNode(x[1])); lg.appendChild(s)});
      mas.append(hd,bar,g,lg);
      document.querySelectorAll('.cards a.card').forEach(function(a){ var mm=a.getAttribute('href').match(/(\d+)\/$/), p=mm&&pub[+mm[1]]; if(!p) return;
        var o=a.querySelector('.pg-badge'); if(o) o.remove(); var st=stateOf(p); if(st==='new') return;
        a.querySelector('.top').appendChild(el('span','pg-badge '+st,st==='learned'?'✓ נלמד':nLearned(p)+'/'+p.n.length)); });
    }
    painters.push(paintMas); paintMas();
  }
  window.addEventListener('storage',function(e){ if(e.key===KEY){ try{S=norm(JSON.parse(e.newValue||'null'))}catch(x){} if(P) E=entry(P.k); refresh(); } });
})();
