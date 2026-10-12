/* navigation between dapim: the sticky bar (.dnav, rendered by build.py) and the jump panel.
   Panel: masechet tabs → every daf of the masechet, grouped by perek; learned ✓ / opened (from the
   dafProgress store in this browser), today's daf and the current daf marked; unpublished dapim greyed.
   Also: the "היום" link, ←/→ keys on a daf page, and the bar hides while scrolling down. Data: #catalog. */
(function(){
  var bar=document.querySelector('.dnav'); if(!bar) return;
  var C; try{C=JSON.parse(document.getElementById('catalog').textContent)}catch(e){return}
  if(!C||!C.pages||!C.mas) return;
  var cur={s:bar.getAttribute('data-slug')||'', d:+bar.getAttribute('data-daf')||0};
  var have={}; C.pages.forEach(function(p){have[p.k]=p});
  function el(t,c,txt){var e=document.createElement(t);if(c)e.className=c;if(txt!=null)e.textContent=txt;return e}
  function heb(n){ var o=''; [[400,'ת'],[300,'ש'],[200,'ר'],[100,'ק']].forEach(function(a){while(n>=a[0]){o+=a[1];n-=a[0]}});
    if(n===15||n===16) return o+'ט'+(n===15?'ו':'ז');
    [[90,'צ'],[80,'פ'],[70,'ע'],[60,'ס'],[50,'נ'],[40,'מ'],[30,'ל'],[20,'כ'],[10,'י']].forEach(function(a){if(n>=a[0]){o+=a[1];n-=a[0]}});
    return o+(n?'אבגדהוזחט'.charAt(n-1):''); }
  function today(){ try{return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jerusalem'}).format(new Date())}catch(e){return new Date().toISOString().slice(0,10)} }
  function store(){ try{return JSON.parse(localStorage.getItem('dafProgress')||'null')||{}}catch(e){return {}} }
  function state(S,p){
    var e=S.pages&&S.pages[p.k], pre=S.pre&&S.pre[p.s];
    if(pre&&p.d<=pre) return 'learned';
    if(!e||!e.s) return '';
    var n=p.n.filter(function(id){return e.s[id]==='learned'}).length;
    return p.n.length&&n===p.n.length?'learned':(Object.keys(e.s).length?'opened':'');
  }
  var T=today(), tp=null; C.pages.forEach(function(p){ if(p.y===T) tp=p; });

  /* today */
  var tl=bar.querySelector('.dn-today');
  if(tl&&tp&&!(tp.s===cur.s&&tp.d===cur.d)){ tl.href='/'+tp.k+'/'; tl.title='הדף היומי של היום: '+tp.h; tl.hidden=false; }

  /* jump panel */
  var pick=bar.querySelector('.dn-pick'), dlg=null, sel=null;
  var order=Object.keys(C.mas).sort(function(a,b){return (C.mas[a].o||0)-(C.mas[b].o||0)});
  function grid(slug, body){
    var M=C.mas[slug], S=store(); body.textContent='';
    var head=el('div','dn-mhead'); var ml=el('a','dn-mlink','לעמוד המסכת ←'); ml.href='/'+slug+'/';
    var cnt=C.pages.filter(function(p){return p.s===slug}).length;
    head.append(el('span',null,cnt+' דפים מוכנים מתוך '+(M.last-M.first+1)), ml); body.append(head);
    var P=M.p&&M.p.length?M.p:[['',M.first,M.last]];
    P.forEach(function(pk,i){
      var from=Math.max(pk[1],M.first), to=i+1<P.length?P[i+1][1]-1:M.last;
      if(i===0) from=M.first;
      if(to<from) return;
      var g=el('div','dn-perek'); if(pk[0]) g.append(el('div','dn-ph','פרק '+heb(i+1)+(pk[0]?' · '+pk[0]:'')));
      var row=el('div','dn-grid');
      for(var d=from; d<=to; d++){
        var p=have[slug+'/'+d], c;
        if(p){ c=el('a','dn-d',heb(d)); c.href='/'+p.k+'/'; c.title=p.h+(p.t?' — '+p.t:'');
          var st=state(S,p); if(st) c.classList.add('is-'+st);
          if(p.y===T) c.classList.add('is-today');
          if(slug===cur.s&&d===cur.d){ c.classList.add('is-cur'); c.setAttribute('aria-current','page'); } }
        else { c=el('span','dn-d is-off',heb(d)); c.title='עדיין לא הוכן'; }
        row.append(c);
      }
      g.append(row); body.append(g);
    });
  }
  function build(){
    dlg=el('div','dn-bg'); dlg.hidden=true;
    var box=el('div','dn-dlg'); box.setAttribute('role','dialog'); box.setAttribute('aria-modal','true'); box.setAttribute('aria-label','מעבר לדף');
    var h=el('div','dn-h'); h.append(el('b',null,'מעבר לדף'));
    var x=el('button','dn-x','✕'); x.type='button'; x.setAttribute('aria-label','סגירה'); x.onclick=close; h.append(x);
    var tabs=el('div','dn-tabs'); tabs.setAttribute('role','tablist');
    var body=el('div','dn-body');
    sel=cur.s&&C.mas[cur.s]?cur.s:(tp?tp.s:order[0]);
    order.forEach(function(slug){
      var t=el('button','dn-tab','מסכת '+C.mas[slug].he); t.type='button'; t.setAttribute('role','tab');
      t.setAttribute('aria-selected',slug===sel); t.onclick=function(){ sel=slug;
        [].forEach.call(tabs.children,function(b){b.setAttribute('aria-selected',b===t)}); grid(slug,body); };
      tabs.append(t);
    });
    var leg=el('div','dn-leg'); leg.innerHTML='<span><i class="is-learned"></i>נלמד</span><span><i class="is-today"></i>היום</span><span><i class="is-off"></i>טרם הוכן</span>';
    box.append(h,tabs,body,leg); dlg.append(box); document.body.append(dlg);
    dlg.addEventListener('click',function(e){ if(e.target===dlg) close(); });
    dlg.addEventListener('keydown',function(e){ if(e.key==='Escape') close(); });
    dlg._body=body;
  }
  function open(){
    if(!dlg) build();
    grid(sel,dlg._body); dlg.hidden=false; document.documentElement.classList.add('dn-open');
    pick.setAttribute('aria-expanded','true');
    var f=dlg.querySelector('.dn-d.is-cur')||dlg.querySelector('.dn-tab[aria-selected="true"]');
    if(f){ f.focus({preventScroll:true}); if(f.scrollIntoView) f.scrollIntoView({block:'center'}); }
  }
  function close(){ if(!dlg||dlg.hidden) return; dlg.hidden=true; document.documentElement.classList.remove('dn-open');
    pick.setAttribute('aria-expanded','false'); pick.focus({preventScroll:true}); }
  pick.addEventListener('click',open);

  /* ←/→ on a daf page (RTL: ← is forward); never while typing or with a modifier */
  if(cur.d) document.addEventListener('keydown',function(e){
    if(e.altKey||e.ctrlKey||e.metaKey||e.shiftKey||(dlg&&!dlg.hidden)) return;
    var t=e.target, tag=t&&t.tagName; if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT'||(t&&t.isContentEditable)) return;
    var a=e.key==='ArrowLeft'?bar.querySelector('a.dn-next'):e.key==='ArrowRight'?bar.querySelector('a.dn-prev'):null;
    if(a){ e.preventDefault(); location.href=a.href; }
  });

  /* the bar slides away while reading down and comes back on any scroll up */
  var lastY=window.scrollY, ticking=false, top0=bar.getBoundingClientRect().top+window.scrollY;   /* its place before it sticks */
  addEventListener('scroll',function(){ if(ticking) return; ticking=true; requestAnimationFrame(function(){
    var y=window.scrollY; if(Math.abs(y-lastY)>6){ bar.classList.toggle('dn-hide', y>lastY&&y>top0+120); lastY=y; } ticking=false; }); },{passive:true});
})();
