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
  var SKIP='A,BUTTON,H1,H3,SCRIPT,.quiz,.map,.tag,.fb,footer,.term,.links,.card,.meta,details.storyline,details.flowd,.nogl';
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
        var start=hit.index+hit[1].length, pl=hit[2].length;
        var mid=n.splitText(start); var rest=mid.splitText(pl+k.length);
        var b=document.createElement('button'); b.type='button'; b.className='term info'+((G[k].t==='תנא'||G[k].t==='אמורא')?' person':''); b.textContent=k; b.setAttribute('aria-haspopup','dialog'); b.setAttribute('aria-expanded','false'); b.title='הקש להסבר'; b.dataset.k=k;
        var w=document.createElement('span'); w.className='tw'; if(pl) w.appendChild(document.createTextNode(hit[2])); w.appendChild(b);
        mid.parentNode.replaceChild(w,mid); n=rest;
      }
    });
  }
  function amudLinks(art){
    var tr=art.dataset.tractate, daf=parseInt(art.dataset.daf,10); if(!tr||!daf) return;
    art.querySelectorAll('.sugya > .amud').forEach(function(el){
      if(el.firstChild&&el.firstChild.nodeType===3&&el.firstChild.nodeValue.trim()){var at=document.createElement('span'); at.className='amud-t'; at.textContent=el.firstChild.nodeValue.trim(); at.title=at.textContent; el.replaceChild(at,el.firstChild)}
      if(el.dataset.ref){var sb=mkSrc(SEF+el.dataset.ref+'?lang=he','לשון הגמרא'); if(sb.tagName==='BUTTON') sb.innerHTML='<span class="m-hide">לשון </span>הגמרא'; el.appendChild(sb);
        if(sb.tagName==='BUTTON'){var st=mkSrc(SEF+el.dataset.ref+'?lang=he','שטיינזלץ'); st.dataset.st='1'; st.classList.add('st'); el.appendChild(st)} return;}
      var t=el.textContent, m=t.match(new RegExp('\\((['+H+']{1,3})([.:])\\)')), ref=null;
      if(m){ref=tr+'.'+gem(m[1])+(m[2]===':'?'b':'a')}
      else{var a=t.match(/עמוד ([אב])/); if(a) ref=tr+'.'+daf+(a[1]==='א'?'a':'b')}
      if(!ref) return;
      var l=document.createElement('a'); l.className='src'; l.href=SEF+ref+'?lang=he'; l.target='_blank'; l.rel='noopener'; l.textContent='לשון הגמרא'; el.appendChild(l);
    });
    var meta=art.querySelector('header .meta');
    if(meta&&!art.querySelector('.sefaria-bar,.tmeta')){var d=document.createElement('div'); d.className='sefaria-bar'; d.innerHTML='<a class="src" target="_blank" rel="noopener" href="'+SEF+tr+'.'+daf+'a?lang=he">פתח את הדף בספריא</a>'; meta.after(d)}
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
  /* Steinsaltz (William Davidson Edition, CC-BY-NC) — loaded live from Sefaria in the reader's
     browser, never stored in the repo. Gemara segment i ↔ Steinsaltz segment i on the same amud. */
  var ST={};
  function norm(t){return (t||'').replace(/<[^>]+>/g,' ').replace(/[֑-ׇ]/g,'').replace(/[^א-ת\s]/g,' ').replace(/\s+/g,' ').trim()}
  function amudim(key){
    var m=key.match(/^(.+)\.(\d+)([ab])(?:\.\d+)?(?:-(?:(\d+)([ab])\.)?\d+)?$/); if(!m) return null;
    var tr=m[1], d=+m[2], a=m[3], ed=m[4]?+m[4]:d, ea=m[5]||a, out=[];
    for(var g=0; g<6; g++){ out.push(tr+'.'+d+a); if(d===ed&&a===ea) break; if(a==='a'){a='b'} else {a='a'; d++} }
    return out;
  }
  function getJ(u){return fetch(u).then(function(r){if(!r.ok) throw r.status; return r.json()})}
  function chunks(html){
    // <b>gemara</b> explanation … → phrase chunks; a short insertion (≤2 words) between bold runs stays in the same chunk
    var parts=String(html||'').replace(/<(?!\/?(b|strong)>)[^>]+>/g,'').split(/<\/?(?:b|strong)>/), out=[], cur=null;
    function words(t){return (norm(t).match(/\S+/g)||[]).length}
    parts.forEach(function(t,i){
      if(!t) return;
      if(i%2){ if(!cur||(cur.open&&cur.tail<=2)){ if(!cur){cur={g:'',p:[]}; out.push(cur)} } else {cur={g:'',p:[]}; out.push(cur)}
        cur.g+=' '+t; cur.p.push({b:1,t:t}); cur.open=true; cur.tail=0 }
      else { if(!cur){cur={g:'',p:[]}; out.push(cur)} cur.p.push({b:0,t:t}); cur.tail=(cur.tail||0)+words(t); }
    });
    return out;
  }
  function renderParts(el,c){ c.p.forEach(function(x){ if(x.b){var bb=document.createElement('b'); bb.textContent=x.t; el.appendChild(bb)} else el.appendChild(document.createTextNode(x.t)) }) }
  function loadSt(key){
    if(ST[key]) return ST[key];
    var am=amudim(key); if(!am) return Promise.reject('ref');
    return ST[key]=Promise.all(am.map(function(r){
      return Promise.all([getJ(SEF+'api/texts/'+r+'?lang=he&context=0&commentary=0'),getJ(SEF+'api/texts/Steinsaltz_on_'+r+'?lang=he&context=0&pad=0')])
        .then(function(x){var g=x[0].he||[], s=x[1].he||[]; return g.map(function(t,i){return {n:norm(t), s:s[i]||''}})});
    })).then(function(l){return [].concat.apply([],l)}).catch(function(e){delete ST[key]; throw e});
  }
  function alignPara(segs,text){
    var n=norm(text), seg=null;
    segs.some(function(x){if(x.n===n){seg=x;return true}});
    if(!seg&&n.length>8) segs.some(function(x){var a=n.slice(0,30), b=x.n.slice(0,30); if(x.n.indexOf(a)===0||n.indexOf(b)===0){seg=x;return true}});
    if(!seg) return null;
    var ch=chunks(seg.s), bw=[]; ch.forEach(function(c,ci){norm(c.g).split(' ').forEach(function(w){if(w) bw.push({w:w,c:ci})})});
    return {ch:ch, bw:bw};
  }
  function mapTokens(al,toks){
    var j=0, last=-1;
    return toks.map(function(t){
      var w=norm(t); if(!w) return last;
      for(var k=j; k<Math.min(al.bw.length,j+6); k++){var b=al.bw[k].w; if(b===w||(w.length>2&&b.length>2&&(b.indexOf(w)===0||w.indexOf(b)===0))){j=k+1; return last=al.bw[k].c}}
      return last<0&&al.bw.length?(last=al.bw[0].c):last;
    });
  }
  var lastFocus=null, bg=null;
  function closeSrc(){ if(bg){bg.remove(); bg=null; if(lastFocus) lastFocus.focus()} }
  function openSrc(a){
    var key=a.dataset.ref; var it=SRC[key]; if(!it) return false;
    closePop(); lastFocus=a;
    bg=document.createElement('div'); bg.className='srcdlg-bg';
    var d=document.createElement('div'); d.className='srcdlg'; d.setAttribute('role','dialog'); d.setAttribute('aria-modal','true');
    var h=document.createElement('header'); var h4=document.createElement('h4'); h4.textContent=it.t; var x=document.createElement('button'); x.type='button'; x.className='x'; x.setAttribute('aria-label','סגור'); x.textContent='×'; x.onclick=closeSrc; h.append(h4,x);
    var isGem=/^[A-Z][A-Za-z_ ]+\.\d+[ab]/.test(key); if(isGem) d.classList.add('gem');
    var b=document.createElement('div'); b.className='body'; var paras=[];
    var stFirst=isGem&&!!a.dataset.st, hold=stFirst?document.createDocumentFragment():b;
    (it.p||[]).forEach(function(t){var p=document.createElement('p'); if(t==='…'){p.className='gap'; p.textContent=t}
      else if(isGem){ t.split(/(\s+)/).forEach(function(w){ if(/\S/.test(w)){var sp=document.createElement('span'); sp.className='w'; sp.textContent=w; p.appendChild(sp)} else p.appendChild(document.createTextNode(w)) }); paras.push({el:p,text:t}) }
      else p.textContent=t;
      hold.appendChild(p)});
    if(stFirst){var ld=document.createElement('p'); ld.className='gap'; ld.textContent='טוען ביאור…'; b.appendChild(ld)}
    var flush=function(){ if(hold!==b){ b.replaceChildren(hold); hold=b } };
    var f=document.createElement('footer'); var sp=document.createElement('span'); sp.textContent='הטקסט מתוך ספריא'; var l=document.createElement('a'); l.className='src'; l.href=a.dataset.url; l.target='_blank'; l.rel='noopener'; l.textContent='פתח בספריא'; l.dataset.external='1'; f.append(sp,l);
    var card=null;
    if(isGem){
      var tog=document.createElement('button'); tog.type='button'; tog.className='st-tog'; tog.textContent='שטיינזלץ'; tog.setAttribute('aria-pressed','false'); h.insertBefore(tog,x);
      card=document.createElement('div'); card.className='stw'; card.hidden=true; card.setAttribute('aria-live','polite');
      var credit=function(){sp.textContent='ביאור שטיינזלץ · CC-BY-NC · ספריא'};
      var ready=function(){ return loadSt(key).then(function(segs){ paras.forEach(function(P){ if(P.al!==undefined) return; P.al=alignPara(segs,P.text); var ws=P.el.querySelectorAll('.w'); P.ws=ws; P.map=P.al?mapTokens(P.al,[].map.call(ws,function(w){return w.textContent})):[] }); credit(); return segs }) };
      var fail=function(){card.hidden=false; card.textContent='לא ניתן לטעון את ביאור שטיינזלץ מספריא כרגע.'};
      tog.onclick=function(){
        var on=tog.getAttribute('aria-pressed')!=='true'; tog.setAttribute('aria-pressed',on);
        if(!on){ b.querySelectorAll('.stx').forEach(function(e){e.remove()}); return }
        tog.classList.add('busy');
        ready().then(function(){ tog.classList.remove('busy'); paras.forEach(function(P){ if(!P.al) return; var dv=document.createElement('div'); dv.className='stx';
          P.al.ch.forEach(function(c){ renderParts(dv,c) });
          P.el.after(dv) }); flush() }).catch(function(){flush(); tog.classList.remove('busy'); tog.setAttribute('aria-pressed','false'); fail()});
      };
      b.addEventListener('click',function(e){
        var w=e.target.closest('.w'); if(!w) return;
        b.querySelectorAll('.w.on').forEach(function(o){o.classList.remove('on')});
        card.hidden=false; card.textContent='טוען ביאור…';
        ready().then(function(){
          var P=paras.filter(function(P){return P.el.contains(w)})[0]; if(!P) return;
          var i=[].indexOf.call(P.ws,w), ci=P.map[i];
          if(!P.al||ci==null||ci<0){card.textContent='לא נמצא ביאור למילה זו.'; return}
          var c=P.al.ch[ci], words=[];
          P.map.forEach(function(v,k){if(v===ci){P.ws[k].classList.add('on'); words.push(P.ws[k].textContent)}});
          card.innerHTML=''; renderParts(card,c);
        }).catch(fail);
      });
    }
    d.append(h,b); if(card) d.append(card); d.append(f); bg.appendChild(d); document.body.appendChild(bg);
    bg.addEventListener('click',function(e){if(e.target===bg)closeSrc()}); x.focus();
    if(isGem&&a.dataset.st) d.querySelector('.st-tog').click();
    return true;
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
      mode.textContent='חברותא';
      art.querySelectorAll('.steps li.ans').forEach(function(li){li.classList.remove('shown'); li.setAttribute('aria-expanded','false'); var g=li.querySelector('.cv'); if(g) g.remove();});
      art.querySelectorAll('section.sugya').forEach(function(sec){ if(sec.querySelector('li.ans')) sec.classList.remove('cv-done'); var r=sec.querySelector('.cv-res'); if(r) r.remove();});
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
      var tb=art.querySelector('.controls [data-role="tree"]'), newTb=!tb;
      if(newTb){tb=document.createElement('button'); tb.className='btn'; tb.type='button'; tb.dataset.role='tree'; tb.setAttribute('aria-pressed','false');
      tb.textContent='עץ';
      tb.title='כל שלב מוזח תחת השלב שעליו הוא עונה; המספר ↲ מציין את השלב שאליו הוא מתייחס';}
      tb.addEventListener('click',function(){var on=tb.getAttribute('aria-pressed')!=='true';tb.setAttribute('aria-pressed',on);art.classList.toggle('tree-mode',on);tb.textContent='עץ';});
      if(newTb) mode.parentNode.appendChild(tb);
    })();
    /* חברותא: questions, sources and proofs stay visible; only the answers (תירוץ/דחייה/מסקנה…) are hidden.
       Reveal one (tap / Enter), say whether you knew it; summaries of the sugya stay closed until it is done. */
    function cvCheck(sec){
      var all=sec.querySelectorAll('.steps li.ans'), shown=sec.querySelectorAll('.steps li.ans.shown');
      if(!all.length||shown.length<all.length||sec.classList.contains('cv-done')) return;
      sec.classList.add('cv-done');
      var ok=sec.querySelectorAll('.cv .on.ok').length, tot=sec.querySelectorAll('.cv .on').length;
      if(tot){ var r=document.createElement('p'); r.className='cv-res'; r.textContent='ידעת '+ok+' מתוך '+tot+' תשובות בסוגיה'; var ol=sec.querySelector('ol.steps'); ol.after(r); }
    }
    function reveal(li){
      if(!art.classList.contains('hide-mode')||li.classList.contains('shown')) return;
      li.classList.add('shown'); li.setAttribute('aria-expanded','true');
      var sec=li.closest('section.sugya'), g=document.createElement('span'); g.className='cv';
      [['ok','✓ ידעתי'],['no','✗ לא ידעתי']].forEach(function(x){ var b=document.createElement('button'); b.type='button'; b.className=x[0]; b.textContent=x[1];
        b.addEventListener('click',function(ev){ ev.stopPropagation(); g.querySelectorAll('button').forEach(function(y){y.classList.remove('on')}); b.classList.add('on');
          document.dispatchEvent(new CustomEvent('daf:cv',{detail:{sec:sec&&sec.id,k:li.dataset.k,ok:x[0]==='ok'}})); cvCheck(sec); });
        g.appendChild(b); });
      li.querySelector('.body').appendChild(g); if(sec) cvCheck(sec);
    }
    art.querySelectorAll('.steps li').forEach(function(li){
      var tg=li.querySelector('.tag'); if(!tg||!(tg.classList.contains('a')||tg.classList.contains('c'))) return;
      li.classList.add('ans'); li.tabIndex=0; li.setAttribute('role','button'); li.setAttribute('aria-expanded','false');
      li.addEventListener('click',function(){reveal(li)});
      li.addEventListener('keydown',function(e){ if(e.key==='Enter'||e.key===' '){ if(art.classList.contains('hide-mode')&&!li.classList.contains('shown')){e.preventDefault(); reveal(li);} } });
    });
    art.querySelectorAll('section.sugya').forEach(function(sec){ if(!sec.querySelector('li.ans')) sec.classList.add('cv-done'); });
    art.querySelectorAll('section.sugya ol.steps').forEach(function(ol){
      if(!ol.querySelector('li.ans')) return;
      var b=document.createElement('button'); b.type='button'; b.className='btn cv-all'; b.textContent='גלה את כל התשובות';
      b.addEventListener('click',function(){ ol.querySelectorAll('li.ans').forEach(function(li){ li.classList.add('shown'); li.setAttribute('aria-expanded','true'); }); var sec=ol.closest('section.sugya'); if(sec){ sec.classList.add('cv-done'); } });
      ol.before(b);
    });
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
      var gb=ctr.querySelector('[data-role="prefs"]'), newGb=!gb;
      if(newGb){gb=document.createElement('button'); gb.type='button'; gb.className='btn'; gb.setAttribute('aria-expanded','false'); gb.textContent='⚙'; gb.setAttribute('aria-label','הגדרות');}
      var pn=document.createElement('div'); pn.className='prefs'; pn.hidden=true;
      var hd=document.createElement('div'); hd.className='prefs-h'; hd.textContent='נשמר במכשיר זה, לכל הדפים'; pn.appendChild(hd);
      OPTS.forEach(function(o){
        var l=document.createElement('label'); var c=document.createElement('input'); c.type='checkbox'; c.checked=!!P[o[0]];
        c.addEventListener('change',function(){P[o[0]]=c.checked; save(); apply(o[0],c.checked);});
        l.append(c,document.createTextNode(' '+o[1])); pn.appendChild(l);
      });
      gb.addEventListener('click',function(){pn.hidden=!pn.hidden; gb.setAttribute('aria-expanded',!pn.hidden);});
      if(newGb) ctr.appendChild(gb); ctr.after(pn);
      setTimeout(function(){ OPTS.forEach(function(o){ if(P[o[0]]) apply(o[0],true); }); },0);
    })();
    var Q=[]; try{Q=JSON.parse(art.querySelector('.qdata').textContent)}catch(e){}
    var box=art.querySelector('[data-role="quizBox"]'), scoreEl=art.querySelector('[data-role="score"]');
    function render(){
      if(!box) return; box.innerHTML=''; var right=0; scoreEl.textContent='';
      Q.forEach(function(item,i){
        var d=document.createElement('div'); d.className='qitem';
        var p=document.createElement('p'); p.textContent=(i+1)+'. '+item.q; d.appendChild(p);
        var opts=document.createElement('div'); opts.className='opts'; var fb=document.createElement('div'); fb.className='fb'; fb.setAttribute('aria-live','polite');
        var order=item.o.map(function(_,j){return j}); for(var x=order.length-1;x>0;x--){var r=Math.floor(Math.random()*(x+1)),tmp=order[x];order[x]=order[r];order[r]=tmp;}
        var btns={};
        order.forEach(function(j){ var t=item.o[j];
          var b=document.createElement('button'); b.type='button'; b.className='opt'; b.textContent=t; btns[j]=b;
          b.addEventListener('click',function(){
            if(d.dataset.done) return; d.dataset.done=1;
            var ok=j===item.a, v=document.createElement('b'); v.className='qv '+(ok?'ok':'no'); v.textContent=ok?'✓ נכון.':'✗ לא בדיוק.';
            if(ok){b.classList.add('right'); right++;} else{b.classList.add('wrong'); btns[item.a].classList.add('right');}
            fb.textContent=''; fb.append(v,document.createTextNode(' '+(!ok&&item.w&&item.w[j]?item.w[j]+' ':'')+item.e));
            scoreEl.textContent='· '+right+'/'+Q.length;
            if(box.querySelectorAll('.qitem[data-done]').length===Q.length){
              var sm=document.createElement('div'); sm.className='qsum'; sm.setAttribute('role','status');
              sm.appendChild(document.createTextNode('סיימתם את החזרה: '+right+' מתוך '+Q.length+(right===Q.length?' — כל הכבוד!':'')));
              var nx=[].slice.call(art.querySelectorAll('.pager a')).filter(function(a){return a.textContent.indexOf('←')>=0})[0];
              if(nx){var a=document.createElement('a'); a.href=nx.href; a.className='btn'; a.textContent='לדף הבא ←'; sm.appendChild(a);}
              box.appendChild(sm);
            }
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

/* reader feedback: /api/feedback (Cloudflare Pages Functions + D1) */
(function(){
  var LS='daf-fb-notes';
  var ST={'new':'התקבלה, ממתינה לבדיקה','in-progress':'בטיפול','fixed':'טופלה — הדף תוקן ✓','feature':'נרשמה כהצעה לשיפור האתר','rejected':'נבדקה — לא נמצא צורך בשינוי','needs-info':'נדרש פירוט נוסף'};
  var KN={fix:'תיקון בתוכן',missing:'חסר בדף',feature:'הצעה לשיפור'};
  function mine(){try{return JSON.parse(localStorage.getItem(LS)||'[]')}catch(e){return []}}
  function remember(n){try{var a=mine().filter(function(x){return x.id!==n.id});a.push(n);localStorage.setItem(LS,JSON.stringify(a.slice(-50)))}catch(e){}}
  function el(t,c,txt){var e=document.createElement(t);if(c)e.className=c;if(txt!=null)e.textContent=txt;return e}
  function status(pairs){return fetch('/api/feedback/status?n='+pairs.map(function(n){return n.id+'.'+n.token}).join(',')).then(function(r){return r.json()})}
  function hebNum(n){var o='',A=[[400,'ת'],[300,'ש'],[200,'ר'],[100,'ק'],[90,'צ'],[80,'פ'],[70,'ע'],[60,'ס'],[50,'נ'],[40,'מ'],[30,'ל'],[20,'כ'],[10,'י'],[9,'ט'],[8,'ח'],[7,'ז'],[6,'ו'],[5,'ה'],[4,'ד'],[3,'ג'],[2,'ב'],[1,'א']];
    n=+n; if(n%100===15){o='טו';n-=15}else if(n%100===16){o='טז';n-=16} var p=''; A.forEach(function(a){while(n>=a[0]){p+=a[1];n-=a[0]}}); return p+o}
  function trackUrl(n){return location.origin+'/feedback/?n='+n.id+'.'+n.token}

  /* tracking page */
  var tr=document.getElementById('fbtrack');
  if(tr){
    var names={};try{names=JSON.parse(document.getElementById('fb-names').textContent)}catch(e){}
    var q=new URLSearchParams(location.search).get('n');
    if(q) q.split(',').forEach(function(p){var a=p.split('.');if(/^\d+$/.test(a[0])&&/^[0-9a-f]{32}$/.test(a[1]||''))remember({id:+a[0],token:a[1]})});
    var list=document.getElementById('fb-list'), ns=mine();
    if(!ns.length){list.innerHTML='';list.append(el('p','fb-muted','לא נמצאו הערות ששלחתם מהדפדפן הזה.'));return}
    status(ns).then(function(j){
      list.innerHTML='';
      if(!j.ok||!j.notes.length){list.append(el('p','fb-muted','לא נמצאו הערות.'));return}
      j.notes.sort(function(a,b){return b.id-a.id}).forEach(function(n){
        var pg=n.page.split('/'), heb=(names[pg[0]]||pg[0])+' '+hebNum(pg[1]);
        var c=el('div','fb-note st-'+n.status);
        var h=el('div','fb-note-h');
        var a=el('a',null,'מסכת '+heb+(n.section_title?' · '+n.section_title:''));a.href='/'+n.page+'/'+(n.section?'#'+pg[0]+pg[1]+'-'+n.section:'');
        h.append(el('b',null,'#'+n.id),a,el('span',null,KN[n.kind]||''),el('span',null,n.created_at.slice(0,10)));
        c.append(h,el('p','fb-note-t',n.text),el('p','fb-note-s',ST[n.status]||n.status));
        if(n.reply)c.append(el('p','fb-note-r',n.reply));
        list.append(c);
      });
    }).catch(function(){list.innerHTML='';list.append(el('p','fb-muted','לא ניתן לטעון כרגע. נסו שוב מאוחר יותר.'))});
    return;
  }

  var art=document.querySelector('article.daf'); if(!art) return;
  var page=location.pathname.replace(/^\/|\/$/g,'');
  var pre=art.id+'-';
  var cfg=null;
  function getCfg(){return cfg||(cfg=fetch('/api/feedback/config').then(function(r){return r.json()}).catch(function(){return {}}))}
  function turnstile(box){
    return getCfg().then(function(c){
      if(!c.sitekey) return null;
      return new Promise(function(res){
        function go(){var id=window.turnstile.render(box,{sitekey:c.sitekey,language:'he',size:'flexible'});res(id)}
        if(window.turnstile) return go();
        var s=document.createElement('script');s.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';s.async=true;s.onload=go;s.onerror=function(){res(null)};document.head.appendChild(s);
      });
    });
  }
  var KINDS=[['fix','תיקון בתוכן (טעות, ייחוס, ציטוט)'],['missing','חסר בדף (סוגיה, שלב, מקור)'],['feature','הצעה לשיפור האתר']];
  function open(section,title){
    var bg=el('div','srcdlg-bg');
    var d=el('div','srcdlg fb-dlg'); d.setAttribute('role','dialog'); d.setAttribute('aria-modal','true');
    var h=el('header'); var h4=el('h4',null,section?('הערה על: '+title):'הערה על הדף');
    var x=el('button','x','×'); x.type='button'; x.setAttribute('aria-label','סגור'); h.append(h4,x);
    var f=el('form','body fb-form');
    var fs=el('fieldset'); fs.appendChild(el('legend',null,'מה סוג ההערה?'));
    KINDS.forEach(function(k,i){var l=el('label'); var r=document.createElement('input'); r.type='radio'; r.name='kind'; r.value=k[0]; if(!i) r.checked=true; l.append(r,document.createTextNode(' '+k[1])); fs.appendChild(l);});
    var ta=el('textarea'); ta.name='text'; ta.required=true; ta.minLength=5; ta.maxLength=2000; ta.rows=5;
    ta.placeholder='מה בדיוק לתקן או מה חסר? אם אפשר — ציטוט מהגמרא או מקור.';
    var nm=el('input'); nm.name='name'; nm.maxLength=80; nm.placeholder='שם (לא חובה)';
    var em=el('input'); em.name='email'; em.type='email'; em.maxLength=160; em.placeholder='מייל לעדכון (לא חובה)'; em.setAttribute('dir','ltr');
    var nl=el('label','fb-notify'); var nc=document.createElement('input'); nc.type='checkbox'; nc.name='notify';
    nl.append(nc,document.createTextNode(' אשמח לעדכון במייל כשההערה תטופל'));
    em.addEventListener('input',function(){nc.checked=!!em.value.trim()});
    var hp=el('input','fb-hp'); hp.name='website'; hp.tabIndex=-1; hp.autocomplete='off'; hp.setAttribute('aria-hidden','true');
    var ts=el('div','fb-ts');
    var note=el('p','fb-muted','ההערה נשלחת באופן אנונימי. המייל משמש רק לעדכון על הטיפול ונמחק אחריו.');
    var st=el('p','fb-status'); st.setAttribute('aria-live','polite');
    var sb=el('button','btn fb-send','שליחה'); sb.type='submit';
    f.append(fs,ta,nm,em,nl,hp,ts,note,sb,st);
    d.append(h,f); bg.appendChild(d); document.body.appendChild(bg); ta.focus();
    var tsId=null; turnstile(ts).then(function(id){tsId=id});
    function close(){bg.remove();document.removeEventListener('keydown',esc)}
    function esc(e){if(e.key==='Escape')close()}
    x.onclick=close; bg.addEventListener('click',function(e){if(e.target===bg)close()});
    document.addEventListener('keydown',esc);
    var ERR={too_short:'נא לכתוב לפחות כמה מילים.',bad_email:'כתובת המייל אינה תקינה.',captcha:'אימות האבטחה נכשל. נסו שוב.',rate:'נשלחו הרבה הערות בזמן קצר. נסו שוב בעוד שעה.'};
    f.addEventListener('submit',function(e){
      e.preventDefault(); sb.disabled=true; st.textContent='שולח…';
      var kind=(f.querySelector('input[name=kind]:checked')||{}).value||'fix';
      var tok=(tsId!=null&&window.turnstile)?window.turnstile.getResponse(tsId):'';
      fetch('/api/feedback',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({kind:kind,text:ta.value,name:nm.value,email:em.value,notify:nc.checked,website:hp.value,turnstile:tok,page:page,section:section||'',sectionTitle:title||''})})
        .then(function(r){return r.json().catch(function(){return {ok:false}})})
        .then(function(j){
          if(j&&j.ok){
            var n={id:j.id,token:j.token,page:page,section:section||'',title:title||'',at:new Date().toISOString().slice(0,10)};
            if(j.id) remember(n);
            f.innerHTML='';
            var ok=el('p','fb-ok','תודה! ההערה נקלטה'+(j.id?' (מס׳ '+j.id+')':'')+'.');
            var more=el('p',null,'היא תיבדק מול לשון הגמרא בסבב העדכון הלילי, ואם יש צורך — הדף יתוקן.');
            f.append(ok,more);
            if(j.id){
              var tl=el('p','fb-track'); var a=el('a',null,'קישור למעקב אחר ההערה'); a.href=trackUrl(n); a.target='_blank';
              var cp=el('button','btn','העתקת הקישור'); cp.type='button';
              cp.onclick=function(){(navigator.clipboard?navigator.clipboard.writeText(trackUrl(n)):Promise.reject()).then(function(){cp.textContent='הועתק ✓'}).catch(function(){})};
              tl.append(a,document.createTextNode(' '),cp); f.append(tl);
            }
            var c=el('button','btn','סגירה'); c.type='button'; c.onclick=close; f.append(c); c.focus();
          } else {
            sb.disabled=false; st.textContent=ERR[j&&j.error]||'ההערה לא נשמרה. נסו שוב מאוחר יותר.';
            if(tsId!=null&&window.turnstile) window.turnstile.reset(tsId);
          }
        })
        .catch(function(){ sb.disabled=false; st.textContent='אין חיבור. נסו שוב מאוחר יותר.'; });
    });
  }
  var ctr=art.querySelector('.controls');
  if(ctr){var b=ctr.querySelector('[data-role="fb"]'); if(!b){b=el('button','btn','הערה'); b.type='button'; ctr.appendChild(b);} b.onclick=function(){open('','')};}
  function secTools(sec){var t=sec.querySelector('.sec-tools'); if(t) return t; var host=sec.querySelector(':scope > .amud'); t=document.createElement('span'); t.className='sec-tools'; if(host) host.appendChild(t); else {var h=sec.querySelector('h3'); if(!h) return null; h.insertBefore(t,h.firstChild)} return t}
  var secs={};
  art.querySelectorAll('section.sugya[id]').forEach(function(sec){
    if(!sec.querySelector('ol.steps')) return;
    var sid=sec.id.slice(pre.length); var t=(sec.querySelector('h3')||{}).textContent||'';
    var l=el('button','fb-sec'); l.type='button'; l.setAttribute('aria-label','הערה על סוגיה זו'); l.dataset.tip='הערה על סוגיה זו';
    l.innerHTML='<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.2 3.6c-.5.4-1.3.1-1.3-.6V16A2.5 2.5 0 0 1 4 13.5z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M8 8.5h8M8 11.5h5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
    l.onclick=function(){open(sid,t.trim())};
    var tl=secTools(sec); if(tl) tl.appendChild(l); else sec.appendChild(l); secs[sid]=sec;
  });
  function badge(sid,cls,txt,reply){
    var sec=secs[sid]||null, host=sec||art.querySelector('.controls');
    if(!host) return;
    var p=el('p','fb-badge '+cls); p.append(el('span',null,txt)); if(reply){p.append(document.createTextNode(' — '+reply))}
    if(sec) sec.appendChild(p); else host.after(p);
  }
  /* my own notes on this page */
  var own=mine().filter(function(n){return n.page===page});
  if(own.length) status(own).then(function(j){
    (j.notes||[]).forEach(function(n){
      if(n.status==='new') return;
      badge(n.section,'mine st-'+n.status,'ההערה שלך (#'+n.id+'): '+(ST[n.status]||n.status),n.reply);
    });
  }).catch(function(){});
  /* public: fixes made after reader notes */
  fetch('/api/feedback/page?p='+encodeURIComponent(page)).then(function(r){return r.json()}).then(function(j){
    var ownIds=own.map(function(n){return n.id});
    (j.notes||[]).forEach(function(n){ if(ownIds.indexOf(n.id)<0) badge(n.section,'pub','✓ תוקן בעקבות הערת קורא',n.reply); });
  }).catch(function(){});
})();

/* summaries (בקצרה / הקדמה / פרקים): toggle on a clean tap ourselves. On phones a tap that lands while
   the page is still gliding from a scroll only stops the glide and never becomes a click, so the
   learner had to tap twice. A short, still touch on a <summary> now toggles it directly. */
(function(){
  var t0=0, x0=0, y0=0, sum=null;
  document.addEventListener('touchstart',function(e){
    var s=e.target.closest&&e.target.closest('details>summary'); sum=s||null; if(!s||e.touches.length>1) {sum=null; return}
    t0=Date.now(); x0=e.touches[0].clientX; y0=e.touches[0].clientY;
  },{passive:true});
  document.addEventListener('touchmove',function(e){
    if(!sum) return; var t=e.touches[0]; if(Math.abs(t.clientX-x0)>10||Math.abs(t.clientY-y0)>10) sum=null;
  },{passive:true});
  document.addEventListener('touchend',function(e){
    var s=sum; sum=null; if(!s||Date.now()-t0>600) return;
    var end=e.changedTouches[0], hit=document.elementFromPoint(end.clientX,end.clientY);
    if(!hit||!s.contains(hit)) return;
    e.preventDefault();               /* no synthetic click → no double toggle */
    var d=s.parentElement; d.open=!d.open;
  },{passive:false});
})();
