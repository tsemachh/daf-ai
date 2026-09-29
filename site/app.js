/* shared study-page runtime: glossary, sources, tree, chavruta, settings, quiz */
(function(){
  var G={}; try{G=JSON.parse(document.getElementById('glossary').textContent)}catch(e){}
  var H='\u05d0-\u05ea';
  var keys=Object.keys(G).sort(function(a,b){return b.length-a.length});
  function esc(k){return k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}
  var reG=keys.length?new RegExp('(^|[^'+H+'])([והבכלמשד]{0,2})('+keys.map(esc).join('|')+')(?!['+H+'])'):null;
  var NUM={'א':1,'ב':2,'ג':3,'ד':4,'ה':5,'ו':6,'ז':7,'ח':8,'ט':9,'י':10,'כ':20,'ך':20,'ל':30,'מ':40,'ם':40,'נ':50,'ן':50,'ס':60,'ע':70,'פ':80,'ף':80,'צ':90,'ץ':90,'ק':100,'ר':200,'ש':300,'ת':400};
  function gem(w){var n=0;for(var i=0;i<w.length;i++){n+=NUM[w[i]]||0}return n}
  var BOOKS={'בראשית':'Genesis','שמות':'Exodus','ויקרא':'Leviticus','במדבר':'Numbers','דברים':'Deuteronomy','משלי':'Proverbs','ישעיהו':'Isaiah','תהלים':'Psalms'};
  var SEF='https://www.sefaria.org/';
  var RULES=[
    {re:new RegExp('('+Object.keys(BOOKS).join('|')+')\\s+(['+H+']{1,3})[׳\']?,\\s*(['+H+']{1,3})[׳\']?'),url:function(m){return SEF+BOOKS[m[1]]+'.'+gem(m[2])+'.'+gem(m[3])+'?lang=he'}},
    {re:new RegExp('שו״ע יו״ד (['+H+']{1,3}), (['+H+']{1,3})'),url:function(m){return SEF+"Shulchan_Arukh,_Yoreh_De'ah."+gem(m[1])+'.'+gem(m[2])+'?lang=he'}},
    {re:new RegExp('רמב״ם מאכלות אסורות (['+H+']{1,3}), (['+H+']{1,3})'),url:function(m){return SEF+'Mishneh_Torah,_Forbidden_Foods.'+gem(m[1])+'.'+gem(m[2])+'?lang=he'}}
  ];
  var SKIP='A,BUTTON,H1,H3,SCRIPT,.quiz,.map,.tag,.fb,footer,.term,.links,.card,details.storyline,details.flowd';
  function textNodes(root){var out=[],w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:function(n){var p=n.parentElement;if(!p||!n.nodeValue.trim())return 2;return p.closest(SKIP)?2:1}});while(w.nextNode())out.push(w.currentNode);return out}
  function mkSrc(url,text){
    var key=decodeURIComponent(url.replace(SEF,'').split('?')[0]), el;
    var S=window.__SRC||{};
    if(S[key]){ el=document.createElement('button'); el.type='button'; el.className='src'; el.dataset.ref=key; el.dataset.url=url; }
    else { el=document.createElement('a'); el.className='src'; el.href=url; el.target='_blank'; el.rel='noopener'; }
    el.textContent=text; return el;
  }
  function linkify(art){
    textNodes(art).forEach(function(n){
      var guard=0;
      while(n&&guard++<20){
        var best=null,br=null;
        RULES.forEach(function(r){var m=r.re.exec(n.nodeValue); if(m&&(!best||m.index<best.index)){best=m;br=r}});
        if(!best) break;
        var a=mkSrc(br.url(best),best[0]);
        var mid=n.splitText(best.index); var rest=mid.splitText(best[0].length); mid.parentNode.replaceChild(a,mid); n=rest;
      }
    });
  }
  function glossify(art){
    if(!reG) return; var seen={};
    var meta=art.querySelector('header .meta'); if(meta&&!art.querySelector('.legend')){var lg=document.createElement('div'); lg.className='legend'; lg.innerHTML='<span>הקש על מילה מסומנת להסבר קצר:</span><span><span class="lp">חכם</span> — תנא או אמורא</span><span><span class="lt">מושג</span> — מונח, מקום או דין</span>'; meta.after(lg);}
    textNodes(art).forEach(function(n){
      var guard=0;
      while(n&&guard++<20){
        var v=n.nodeValue, re=new RegExp(reG.source,'g'), m, hit=null;
        while((m=re.exec(v))){var k=m[3]; if(seen[k]) continue; if(G[k].np&&m[2]) continue; hit=m; break}
        if(!hit) break;
        var k=hit[3]; seen[k]=1;
        var start=hit.index+hit[1].length+hit[2].length;
        var mid=n.splitText(start); var rest=mid.splitText(k.length);
        var b=document.createElement('button'); b.type='button'; b.className='term info'+((G[k].t==='תנא'||G[k].t==='אמורא')?' person':''); b.textContent=k; b.setAttribute('aria-haspopup','dialog'); b.setAttribute('aria-expanded','false'); b.title='הקש להסבר'; b.dataset.k=k;
        mid.parentNode.replaceChild(b,mid); n=rest;
      }
    });
  }
  function amudLinks(art){
    var tr=art.dataset.tractate, daf=parseInt(art.dataset.daf,10); if(!tr||!daf) return;
    art.querySelectorAll('.sugya > .amud').forEach(function(el){
      if(el.dataset.ref){el.appendChild(mkSrc(SEF+el.dataset.ref+'?lang=he','לשון הגמרא')); return;}
      var t=el.textContent, m=t.match(new RegExp('\\((['+H+']{1,3})([.:])\\)')), ref=null;
      if(m){ref=tr+'.'+gem(m[1])+(m[2]===':'?'b':'a')}
      else{var a=t.match(/עמוד ([אב])/); if(a) ref=tr+'.'+daf+(a[1]==='א'?'a':'b')}
      if(!ref) return;
      var l=document.createElement('a'); l.className='src'; l.href=SEF+ref+'?lang=he'; l.target='_blank'; l.rel='noopener'; l.textContent='לשון הגמרא'; el.appendChild(l);
    });
    var meta=art.querySelector('header .meta');
    if(meta&&!art.querySelector('.sefaria-bar')){var d=document.createElement('div'); d.className='sefaria-bar'; d.innerHTML='<a class="src" target="_blank" rel="noopener" href="'+SEF+tr+'.'+daf+'a?lang=he">פתח את הדף בספריא</a>'; meta.after(d)}
  }
  var pop=document.createElement('div'); pop.className='pop'; pop.hidden=true; pop.setAttribute('role','dialog'); document.body.appendChild(pop); var cur=null;
  function closePop(){pop.hidden=true; if(cur){cur.setAttribute('aria-expanded','false'); cur=null}}
  document.addEventListener('click',function(e){
    var b=e.target.closest&&e.target.closest('.info');
    if(b){e.preventDefault(); if(cur===b){closePop();return} closePop(); var it=G[b.dataset.k]||{};
      pop.innerHTML=''; var pk=document.createElement('div'); pk.className='pk'; pk.textContent=it.t||''; var ph=document.createElement('div'); ph.className='ph'; ph.textContent=b.dataset.k; var pd=document.createElement('div'); pd.textContent=it.d||'';
      pop.append(pk,ph,pd); linkify(pop); pop.hidden=false; cur=b; b.setAttribute('aria-expanded','true');
      var r=b.getBoundingClientRect(), w=Math.min(300,innerWidth-32); pop.style.width=w+'px';
      var left=Math.max(16,Math.min(innerWidth-w-16, r.left+r.width/2-w/2)); pop.style.left=(left+scrollX)+'px'; pop.style.top=(r.bottom+scrollY+8)+'px'; return}
    if(!e.target.closest('.pop')) closePop();
  });
  document.addEventListener('keydown',function(e){if(e.key==='Escape')closePop()});
  window.addEventListener('hashchange',closePop);
  var SRC={}; try{SRC=JSON.parse(document.getElementById('srctext').textContent)}catch(e){} window.__SRC=SRC;
  var lastFocus=null, bg=null;
  function closeSrc(){ if(bg){bg.remove(); bg=null; if(lastFocus) lastFocus.focus()} }
  function openSrc(a){
    var key=a.dataset.ref; var it=SRC[key]; if(!it) return false;
    closePop(); lastFocus=a;
    bg=document.createElement('div'); bg.className='srcdlg-bg';
    var d=document.createElement('div'); d.className='srcdlg'; d.setAttribute('role','dialog'); d.setAttribute('aria-modal','true');
    var h=document.createElement('header'); var h4=document.createElement('h4'); h4.textContent=it.t; var x=document.createElement('button'); x.type='button'; x.className='x'; x.setAttribute('aria-label','סגור'); x.textContent='×'; x.onclick=closeSrc; h.append(h4,x);
    var b=document.createElement('div'); b.className='body'; (it.p||[]).forEach(function(t){var p=document.createElement('p'); if(t==='…'){p.className='gap'} p.textContent=t; b.appendChild(p)});
    var f=document.createElement('footer'); var sp=document.createElement('span'); sp.textContent='הטקסט מתוך ספריא'; var l=document.createElement('a'); l.className='src'; l.href=a.dataset.url; l.target='_blank'; l.rel='noopener'; l.textContent='פתח בספריא'; l.dataset.external='1'; f.append(sp,l);
    d.append(h,b,f); bg.appendChild(d); document.body.appendChild(bg);
    bg.addEventListener('click',function(e){if(e.target===bg)closeSrc()}); x.focus(); return true;
  }
  document.addEventListener('click',function(e){
    var a=e.target.closest&&e.target.closest('button.src[data-ref]'); if(!a) return;
    e.preventDefault(); e.stopPropagation(); openSrc(a);
  },true);
  document.addEventListener('keydown',function(e){if(e.key==='Escape')closeSrc()});
  window.addEventListener('hashchange',closeSrc);
  window.__enrichDaf=function(art){ if(art.dataset.enriched) return; art.dataset.enriched=1; linkify(art); amudLinks(art); glossify(art); };
})();

(function(){
  function initDaf(art){
    if(art.dataset.ready) return; art.dataset.ready=1;
    var mode=art.querySelector('[data-role="mode"]');
    if(mode) mode.addEventListener('click',function(){
      var on=mode.getAttribute('aria-pressed')!=='true';
      mode.setAttribute('aria-pressed',on); art.classList.toggle('hide-mode',on);
      mode.textContent=on?'מצב חברותא פעיל: הקש על שלב לגילוי':'מצב חברותא: הסתר תשובות';
      art.querySelectorAll('.steps li.hideable').forEach(function(li){li.classList.remove('shown')});
    });
    (function(){
      var any=art.querySelector('.steps li[data-k]'); if(!any||!mode) return;
      art.querySelectorAll('ol.steps').forEach(function(ol){
        var map={}; ol.querySelectorAll(':scope>li').forEach(function(li){ if(li.dataset.k!=null) map[li.dataset.k]=li; });
        ol.querySelectorAll(':scope>li').forEach(function(li,idx){
          var d=0,p=li.dataset.p,guard=0; while(p!=null&&map[p]&&guard++<20){d++;p=map[p].dataset.p;}
          li.dataset.d=d; li.style.setProperty('--d',d);
          var tag=li.querySelector('.tag'); if(!tag) return;
          var tn=document.createElement('span'); tn.className='tn';
          tn.textContent=(idx+1)+(li.dataset.p!=null&&map[li.dataset.p]?' · על '+(+li.dataset.p+1):'');
          tag.appendChild(tn);
        });
      });
      var tb=document.createElement('button'); tb.className='btn'; tb.type='button'; tb.dataset.role='tree'; tb.setAttribute('aria-pressed','false');
      tb.textContent='תצוגת עץ';
      tb.title='כל שלב מוזח תחת השלב שעליו הוא עונה; המספר ↲ מציין את השלב שאליו הוא מתייחס';
      tb.addEventListener('click',function(){var on=tb.getAttribute('aria-pressed')!=='true';tb.setAttribute('aria-pressed',on);art.classList.toggle('tree-mode',on);tb.textContent=on?'תצוגת עץ פעילה':'תצוגת עץ';});
      mode.parentNode.appendChild(tb);
    })();
    art.querySelectorAll('.steps li.hideable .body').forEach(function(b){b.addEventListener('click',function(){b.parentElement.classList.add('shown')})});
    art.querySelectorAll('.reveal').forEach(function(btn){btn.addEventListener('click',function(){var a=btn.nextElementSibling;a.hidden=!a.hidden;btn.textContent=a.hidden?'הצג תשובה':'הסתר תשובה';})});
    (function(){
      var KEY='dafPrefs', P={};
      try{P=JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch(e){P={}}
      function save(){try{localStorage.setItem(KEY,JSON.stringify(P))}catch(e){}}
      var ctr=art.querySelector('.controls'); if(!ctr) return;
      var OPTS=[['open','תקצירים והקדמה פתוחים תמיד'],['tree','תצוגת עץ כברירת מחדל'],['chav','מצב חברותא כברירת מחדל']];
      function setOpen(on){art.querySelectorAll('details.storyline,details.flowd').forEach(function(d){d.open=on})}
      function setBtn(role,on){var b=art.querySelector('.controls [data-role="'+role+'"]'); if(b&&(b.getAttribute('aria-pressed')==='true')!==on) b.click();}
      function apply(k,on){ if(k==='open') setOpen(on); if(k==='tree') setBtn('tree',on); if(k==='chav') setBtn('mode',on); }
      var gb=document.createElement('button'); gb.type='button'; gb.className='btn'; gb.setAttribute('aria-expanded','false'); gb.textContent='⚙ הגדרות';
      var pn=document.createElement('div'); pn.className='prefs'; pn.hidden=true;
      var hd=document.createElement('div'); hd.className='prefs-h'; hd.textContent='נשמר במכשיר זה, לכל הדפים'; pn.appendChild(hd);
      OPTS.forEach(function(o){
        var l=document.createElement('label'); var c=document.createElement('input'); c.type='checkbox'; c.checked=!!P[o[0]];
        c.addEventListener('change',function(){P[o[0]]=c.checked; save(); apply(o[0],c.checked);});
        l.append(c,document.createTextNode(' '+o[1])); pn.appendChild(l);
      });
      gb.addEventListener('click',function(){pn.hidden=!pn.hidden; gb.setAttribute('aria-expanded',!pn.hidden);});
      ctr.appendChild(gb); ctr.after(pn);
      setTimeout(function(){ OPTS.forEach(function(o){ if(P[o[0]]) apply(o[0],true); }); },0);
    })();
    var Q=[]; try{Q=JSON.parse(art.querySelector('.qdata').textContent)}catch(e){}
    var box=art.querySelector('[data-role="quizBox"]'), scoreEl=art.querySelector('[data-role="score"]');
    function render(){
      if(!box) return; box.innerHTML=''; var right=0; scoreEl.textContent='';
      Q.forEach(function(item,i){
        var d=document.createElement('div'); d.className='qitem';
        var p=document.createElement('p'); p.textContent=(i+1)+'. '+item.q; d.appendChild(p);
        var opts=document.createElement('div'); opts.className='opts'; var fb=document.createElement('div'); fb.className='fb';
        item.o.forEach(function(t,j){
          var b=document.createElement('button'); b.type='button'; b.className='opt'; b.textContent=t;
          b.addEventListener('click',function(){
            if(d.dataset.done) return; d.dataset.done=1;
            if(j===item.a){b.classList.add('right'); right++; fb.textContent='נכון. '+item.e;}
            else{b.classList.add('wrong'); opts.children[item.a].classList.add('right'); fb.textContent='לא בדיוק. '+item.e;}
            scoreEl.textContent='· '+right+'/'+Q.length;
          });
          opts.appendChild(b);
        });
        d.appendChild(opts); d.appendChild(fb); box.appendChild(d);
      });
    }
    render(); var rs=art.querySelector('[data-role="resetQuiz"]'); if(rs) rs.addEventListener('click',render);
  }
  document.querySelectorAll('article.daf').forEach(function(a){a.hidden=false; initDaf(a); if(window.__enrichDaf) window.__enrichDaf(a);});
  if(location.hash){var t=document.getElementById(location.hash.slice(1)); if(t) t.scrollIntoView();}

})();
