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

  /* quotes in the sugya steps: a verse quote followed by "(ספר פרק, פסוק)" becomes the source link
     itself (the parenthetical goes); a Gemara quote ״…״ opens the Steinsaltz explanation of those words */
  var HL=new RegExp('['+H+']'), VREF=new RegExp('^\\s*\\(('+Object.keys(BOOKS).join('|')+')\\s+(['+H+']{1,3})[׳\']?,\\s*(['+H+']{1,3})[׳\']?(?:[–-]['+H+']{1,3}[׳\']?)?\\)');
  function quotes(art){
    art.querySelectorAll('.steps .body, .verdicts li, .think').forEach(function(body){
      var nodes=[], flat='', w=document.createTreeWalker(body,NodeFilter.SHOW_TEXT,{acceptNode:function(n){return n.parentElement.closest('button,a,.tag')?2:1}});
      while(w.nextNode()){ nodes.push({n:w.currentNode,o:flat.length}); flat+=w.currentNode.nodeValue; }
      if(flat.indexOf('״')<0) return;
      function at(pos){ for(var k=nodes.length-1;k>=0;k--){ if(nodes[k].o<=pos) return {n:nodes[k].n,i:pos-nodes[k].o}; } return null; }
      var pairs=[], open=-1;
      for(var i=0;i<flat.length;i++){ if(flat[i]!=='״') continue;
        var pl=HL.test(flat[i-1]||' '), nl=HL.test(flat[i+1]||' ');
        if(open<0){ if(nl&&(!pl||/[ומשהכלב]/.test(flat[i-1])&&!HL.test(flat[i-2]||' '))) open=i; }
        else if(pl||/[?!.׳]/.test(flat[i-1])){ if(!nl){ pairs.push([open,i]); open=-1; } }
      }
      for(var k=pairs.length-1;k>=0;k--){
        var a=pairs[k][0], b=pairs[k][1], after=flat.slice(b+1), vm=after.match(VREF);
        var txt=flat.slice(a+1,b); if(!vm&&(txt.split(/\s+/).length<2||!body.closest('section.sugya'))) continue;
        var s0=at(a), s1=at(b); if(!s0||!s1) continue;
        var r=document.createRange(); try{ r.setStart(s0.n,s0.i); r.setEnd(s1.n,s1.i+1); }catch(e){ continue; }
        /* a Gemara quote that cites a verse inside it (׳…׳): the inner verse becomes the link, the outer stays a Gemara quote */
        var inner=null;
        if(vm){ var ib=flat.lastIndexOf('׳',b-1), ia=ib>a?flat.lastIndexOf('׳',ib-1):-1;
          while(ia>a&&HL.test(flat[ia-1])) ia=flat.lastIndexOf('׳',ia-1);
          if(ia>a&&!HL.test(flat[ia-1])&&HL.test(flat[ia+1]||' ')&&!HL.test(flat[ib+1]||' ')&&flat.slice(ia+1,ib).trim().split(/\s+/).length>=2&&flat.slice(a+1,ia).trim().split(/\s+/).length>=2) inner=[ia,ib]; }
        var url=vm?SEF+BOOKS[vm[1]]+'.'+gem(vm[2])+'.'+gem(vm[3])+'?lang=he':null, vref=vm?vm[0].trim().replace(/^\(|\)$/g,''):'';
        function vlink(){ var v=mkSrc(url,''); v.classList.add('q-src'); v.title=vref; v.setAttribute('aria-label',(v.textContent||'')+' '+vref); return v; }
        var el;
        if(vm&&!inner){ el=vlink(); el.setAttribute('aria-label',txt+' — '+vref); }
        else { el=document.createElement('span'); el.className='gq'; el.tabIndex=0; el.setAttribute('role','button'); el.title='ביאור שטיינזלץ'; }
        if(inner){ var i0=at(inner[0]), i1=at(inner[1]);
          if(i0&&i1){ var ri=document.createRange(); try{ ri.setStart(i0.n,i0.i); ri.setEnd(i1.n,i1.i+1); var v=vlink(); v.appendChild(ri.extractContents()); ri.insertNode(v); }catch(e){} } }
        el.appendChild(r.extractContents()); r.insertNode(el);
        /* the "(ספר פרק, פסוק)" right after the quote is now the link's title: drop it from the text */
        if(vm){ var nx=el.nextSibling; if(nx&&nx.nodeType===3&&nx.nodeValue.indexOf(vm[0])===0) nx.nodeValue=nx.nodeValue.slice(vm[0].length); }
      }
    });
  }
  /* the verse shown at the top of a sugya: the verse itself is the source link (like verse quotes in the steps) */
  function verseHeads(art){
    art.querySelectorAll('section.sugya > blockquote').forEach(function(bq){
      var c=bq.querySelector('cite'), a=c&&c.querySelector('.src'); if(!a) return;
      var ref=a.textContent.trim(); a.textContent=''; a.classList.add('q-src'); a.title=ref;
      while(bq.firstChild&&bq.firstChild!==c) a.appendChild(bq.firstChild);
      a.setAttribute('aria-label',a.textContent+' — '+ref); bq.insertBefore(a,c);
      c.textContent=ref; c.classList.add('vref');
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
        .then(function(x){var g=x[0].he||[], s=x[1].he||[]; return g.map(function(t,i){return {n:norm(t), s:s[i]||'', a:r, i:i}})});
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

  /* tap a Gemara quote in the steps → Steinsaltz for those words (from the section's own amud text) */
  /* Rashi on the Gemara (Sefaria): one list of comments per Gemara segment */
  var RS={};
  function loadRashi(amud){ return RS[amud]||(RS[amud]=getJ(SEF+'api/texts/Rashi_on_'+amud+'?lang=he&context=0&pad=0').then(function(x){return x.he||[]}).catch(function(e){delete RS[amud]; throw e})); }
  function cmtPref(){ try{ var P=JSON.parse(localStorage.getItem('dafPrefs')||'{}')||{}; return P.rashi?'rashi':'st'; }catch(e){ return 'st'; } }
  function setCmtPref(m){ try{ var P=JSON.parse(localStorage.getItem('dafPrefs')||'{}')||{}; P.rashi=(m==='rashi'); localStorage.setItem('dafPrefs',JSON.stringify(P)); }catch(e){} document.dispatchEvent(new CustomEvent('daf:cmt',{detail:m})); }
  /* tap a Gemara quote in the steps → Steinsaltz or Rashi for those words (tabs; the default is a setting) */
  function stPop(q){
    var sec=q.closest('section.sugya'), am=sec&&sec.querySelector(':scope > .amud'), key=am&&am.dataset.ref;
    closePop(); pop.innerHTML='';
    var tabs=document.createElement('div'); tabs.className='cm-tabs'; tabs.setAttribute('role','tablist');
    var T={}; [['st','שטיינזלץ'],['rashi','רש״י']].forEach(function(x){ var t=document.createElement('button'); t.type='button'; t.className='cm-tab'; t.setAttribute('role','tab'); t.textContent=x[1]; t.dataset.m=x[0]; T[x[0]]=t; tabs.appendChild(t); });
    var pd=document.createElement('div'); pd.className='st-pd'; pd.textContent='טוען…';
    var cr=document.createElement('div'); cr.className='st-cr';
    pop.append(tabs,pd,cr);
    pop.hidden=false; cur=q; q.setAttribute('aria-expanded','true');
    var r=q.getBoundingClientRect(), w=Math.min(340,innerWidth-32); pop.style.width=w+'px';
    var left=Math.max(16,Math.min(innerWidth-w-16, r.left+r.width/2-w/2)); pop.style.left=(left+scrollX)+'px'; pop.style.top=(r.bottom+scrollY+8)+'px';
    if(!key){ pd.textContent='לא נמצא ביאור לציטוט זה.'; return; }
    var full=norm(q.textContent.split(/\.\.\.|…/)[0]), qw=norm(q.textContent).split(' ').filter(Boolean), set={};
    qw.forEach(function(x){ if(x.length>1) set[x]=1; });
    /* the section's own amudim first, then the neighbouring amudim (a sugya often quotes the previous daf) */
    var art=q.closest('article.daf'), tr=art.dataset.tractate, dn=+art.dataset.daf, keys=[key];
    [[dn-1,'b'],[dn,'a'],[dn,'b'],[dn+1,'a']].forEach(function(x){ if(x[0]>1) keys.push(tr+'.'+x[0]+x[1]); });
    function find(segs){
      var probe=full.split(' ').slice(0,3).join(' '), seg=null;
      segs.some(function(x){ if(full.length>3&&x.n.indexOf(full)>=0){seg=x;return true} });
      if(!seg&&probe.split(' ').length>=2) segs.some(function(x){ if(x.n.indexOf(probe)>=0){seg=x;return true} });
      return seg;
    }
    function tryKey(k){
      if(k>=keys.length) return Promise.resolve(null);
      return loadSt(keys[k]).then(function(segs){ return find(segs)||tryKey(k+1); }, function(e){ if(k===0) throw e; return tryKey(k+1); });
    }
    var found=tryKey(0);
    function wEq(a,b){ return a===b||(a.length>2&&b.length>2&&(a===b.slice(1)||b===a.slice(1)||a===b.slice(2)||b===a.slice(2))); }  /* ו/ה/ש prefixes */
    function inQ(w){ return qw.some(function(x){return wEq(x,w)}); }
    /* Steinsaltz: from the bold run holding the quote's first word to the run holding its last word,
       plus the explanation right after it — nothing from neighbouring phrases */
    function showSt(seg){
      cr.textContent='ביאור שטיינזלץ · CC-BY-NC · ספריא';
      var parts=String(seg.s||'').replace(/<(?!\/?(b|strong)>)[^>]+>/g,'').split(/<\/?(?:b|strong)>/);
      /* every bold (Gemara) word with its run and its token index in that run */
      var bw=[], sp=parts.map(function(t){ return t.split(/(\s+)/); });
      for(var i=1;i<parts.length;i+=2) sp[i].forEach(function(tk,z){ norm(tk).split(' ').forEach(function(w){ if(w) bw.push({w:w,i:i,z:z}); }); });
      /* start where the most of the quote's opening words follow in order (a word like ״בידי״ can occur in an earlier phrase too) */
      var k0=-1, best=0;
      for(var k=0;k<bw.length;k++){ var n=0; while(n<qw.length&&k+n<bw.length&&wEq(qw[n],bw[k+n].w)) n++; if(n>best){ best=n; k0=k; if(n===qw.length) break; } }
      if(k0<0) for(var k1=0;k1<bw.length&&k0<0;k1++){ if(qw.slice(0,2).some(function(x){return wEq(x,bw[k1].w)})) k0=k1; }
      if(k0<0){ pd.textContent='לא נמצא ביאור לציטוט זה.'; return; }
      /* end at the quote's last word (Steinsaltz may insert words between the quoted ones) */
      var e0=k0+Math.max(best,1)-1, lw=qw[qw.length-1];
      if(best<qw.length) for(var e=Math.max(e0,k0+1);e<bw.length&&e<=k0+qw.length+12;e++){ if(wEq(lw,bw[e].w)){ e0=e; break; } }
      var start=bw[k0].i, end=bw[e0].i, stop=end+1;
      parts=parts.slice();
      /* the end run runs on into the next phrase: cut it at the quote's last word */
      var ew=sp[end], after=0; for(var y=bw[e0].z+1;y<ew.length;y++){ if(norm(ew[y])) after++; }
      if(after>3){ parts[end]=ew.slice(0,bw[e0].z+1).join(''); stop=end; }
      /* the start run can hold the end of the previous phrase too: start it at the quote's first word */
      parts[start]=(start===end&&stop===end?ew.slice(0,bw[e0].z+1):sp[start]).slice(bw[k0].z).join('');
      /* the explanation after the quote: finish its sentence, and leave out the lead-in to the next phrase */
      if(stop===end+1&&stop<parts.length){
        var tail=parts[stop], dot=Math.max(tail.lastIndexOf('.'),tail.lastIndexOf('?'),tail.lastIndexOf('!'));
        if(/[.?!][\s\)\]]*$/.test(tail)||stop+1>=parts.length){ }
        else if(dot>=0) parts[stop]=tail.slice(0,dot+1);
        else for(var f=stop+1;f<parts.length&&f<=stop+4;f++){ stop=f; if(f%2===0){ var d2=parts[f].search(/[.?!]/); if(d2>=0){ parts[f]=parts[f].slice(0,d2+1); break; } } }
      }
      pd.textContent='';
      for(var m=start;m<=stop&&m<parts.length;m++){ var t=parts[m]; if(!t) continue;
        if(m%2){ var bb=document.createElement('b'); bb.textContent=t; pd.appendChild(bb); } else pd.appendChild(document.createTextNode(t)); }
    }
    /* Rashi: only the comments whose dibbur hamatchil is taken from the quote */
    function rashiFor(seg){
      return loadRashi(seg.a).then(function(all){
        var qn=' '+qw.join(' ')+' ';
        return (all[seg.i]||[]).filter(Boolean).filter(function(c){
          var m=c.match(/<b>([\s\S]*?)<\/b>/), d=norm(m?m[1]:c.split(/\s[-–—]\s/)[0]).split(' ').filter(Boolean).slice(0,3);
          if(!d.length) return false;
          if(qn.indexOf(' '+d.join(' ')+' ')>=0) return true;
          return d.every(inQ)&&d.length>=(qw.length>1?2:1);
        });
      });
    }
    function showRashi(seg){
      cr.textContent='רש״י · ספריא';
      return rashiFor(seg).then(function(list){
        if(cur!==q) return;
        if(!list.length){ pd.textContent='אין רש״י על ציטוט זה.'; return; }
        pd.textContent='';
        list.forEach(function(c){ var p=document.createElement('p'); p.className='cm-r';
          var h=c.replace(/<(?!\/?b>)[^>]+>/g,''); if(h.indexOf('<b>')<0) h=h.replace(/^([^]*?)(\s[-–—]\s)/,'<b>$1</b>$2');
          var tmp=document.createElement('div'); tmp.innerHTML=h; p.append.apply(p,[].slice.call(tmp.childNodes)); pd.appendChild(p); });
      });
    }
    function show(m){
      Object.keys(T).forEach(function(k){ T[k].setAttribute('aria-selected',k===m); T[k].classList.toggle('on',k===m); });
      pd.textContent='טוען…';
      found.then(function(seg){
        if(cur!==q) return;
        if(!seg){ pd.textContent='לא נמצא ביאור לציטוט זה.'; return; }
        return m==='rashi'?showRashi(seg):showSt(seg);
      }).catch(function(){ if(cur===q) pd.textContent='לא ניתן לטעון מספריא כרגע.'; });
    }
    Object.keys(T).forEach(function(k){ T[k].onclick=function(e){ e.stopPropagation(); setCmtPref(k); show(k); }; });
    T.rashi.hidden=true;
    var want=cmtPref();
    found.then(function(seg){ return seg?rashiFor(seg):[]; }).then(function(list){
      if(cur!==q) return;
      if(list.length){ T.rashi.hidden=false; if(want==='rashi') show('rashi'); }
      else if(want==='rashi') show('st');
    }).catch(function(){ if(cur===q&&want==='rashi') show('st'); });
    if(want!=='rashi') show('st'); else pd.textContent='טוען…';
  }
  document.addEventListener('click',function(e){
    if(e.target.closest&&e.target.closest('.info,button,a')) return;
    var q=e.target.closest&&e.target.closest('.gq'); if(!q) return;
    var hl=q.closest('li.ans'); if(hl&&hl.closest('.hide-mode')&&!hl.classList.contains('shown')) return;
    if(cur===q){closePop();return} stPop(q);
  });
  document.addEventListener('keydown',function(e){ if((e.key==='Enter'||e.key===' ')&&e.target.classList&&e.target.classList.contains('gq')){ e.preventDefault(); stPop(e.target); } });
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
  window.__enrichDaf=function(art){ if(art.dataset.enriched) return; art.dataset.enriched=1; quotes(art); linkify(art); verseHeads(art); amudLinks(art); glossify(art); };
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
      var DEF={tree:true}; function val(k){return (k in P)?!!P[k]:!!DEF[k];}
      /* a first-time visitor starts in חברותא (answers hidden — think first, then tap); explained once, easy to turn off */
      var fresh=false;
      try{ if(localStorage.getItem(KEY)===null){ var pr=JSON.parse(localStorage.getItem('dafProgress')||'null'), pk=pr&&pr.pages?Object.keys(pr.pages):[];
        if(pk.length<=1){ P.chav=true; save(); fresh=true; } } }catch(e){}
      var ctr=art.querySelector('.controls'); if(!ctr) return;
      var OPTS=[['open','תקצירים, הקדמה ועזרים פתוחים תמיד'],['tree','תצוגת עץ כברירת מחדל'],['chav','מצב חברותא כברירת מחדל'],['rashi','הקשה על ציטוט פותחת את רש״י (במקום שטיינזלץ)']];
      function setOpen(on){art.querySelectorAll('details.storyline,details.flowd,details.aids').forEach(function(d){d.open=on})}
      function setBtn(role,on){var b=art.querySelector('.controls [data-role="'+role+'"]'); if(b&&(b.getAttribute('aria-pressed')==='true')!==on) b.click();}
      function apply(k,on){ if(k==='open') setOpen(on); if(k==='tree') setBtn('tree',on); if(k==='chav') setBtn('mode',on); }
      var gb=ctr.querySelector('[data-role="prefs"]'), newGb=!gb;
      if(newGb){gb=document.createElement('button'); gb.type='button'; gb.className='btn'; gb.setAttribute('aria-expanded','false'); gb.textContent='⚙'; gb.setAttribute('aria-label','הגדרות');}
      var pn=document.createElement('div'); pn.className='prefs'; pn.hidden=true;
      var hd=document.createElement('div'); hd.className='prefs-h'; hd.textContent='נשמר במכשיר זה, לכל הדפים'; pn.appendChild(hd);
      OPTS.forEach(function(o){
        var l=document.createElement('label'); var c=document.createElement('input'); c.type='checkbox'; c.checked=val(o[0]);
        c.addEventListener('change',function(){P[o[0]]=c.checked; save(); apply(o[0],c.checked);});
        if(o[0]==='rashi') document.addEventListener('daf:cmt',function(e){ P.rashi=e.detail==='rashi'; c.checked=P.rashi; });
        l.append(c,document.createTextNode(' '+o[1])); pn.appendChild(l);
      });
      gb.addEventListener('click',function(){pn.hidden=!pn.hidden; gb.setAttribute('aria-expanded',!pn.hidden);});
      if(newGb) ctr.appendChild(gb); ctr.after(pn);
      setTimeout(function(){ OPTS.forEach(function(o){ if(val(o[0])) apply(o[0],true); }); },0);
      if(fresh){ var hint=document.createElement('p'); hint.className='cv-hint'; hint.setAttribute('role','note');
        hint.innerHTML='<b>מצב חברותא פועל:</b> התשובות בכל סוגיה מוסתרות — חשבו מה עונים, ואז הקישו על השלב כדי לגלות. לכיבוי: כפתור ״חברותא״ למעלה.';
        var hx=document.createElement('button'); hx.type='button'; hx.className='cv-hint-x'; hx.setAttribute('aria-label','הבנתי'); hx.textContent='הבנתי'; hx.onclick=function(){hint.remove()}; hint.appendChild(hx);
        ctr.after(hint); }
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

  /* public notes page */
  var pub=document.getElementById('fbpublic');
  if(pub){
    var pnames={};try{pnames=JSON.parse(document.getElementById('fb-names').textContent)}catch(e){}
    var pl2=document.getElementById('fb-list'), sum=document.getElementById('fb-sum');
    fetch('/api/feedback/public').then(function(r){return r.json()}).then(function(j){
      pl2.innerHTML='';
      var c=j.counts||{}, all=0; Object.keys(c).forEach(function(k){all+=c[k]});
      if(sum&&all) sum.textContent='התקבלו '+all+' הערות · '+(c.fixed||0)+' תוקנו · '+(c.feature||0)+' הצעות לשיפור · '+(c.rejected||0)+' נבדקו בלי שינוי'+((c['new']||0)+(c['in-progress']||0)?' · '+((c['new']||0)+(c['in-progress']||0))+' בטיפול':'');
      if(!j.notes||!j.notes.length){pl2.append(el('p','fb-muted','עדיין אין הערות שטופלו.'));return}
      j.notes.forEach(function(n){
        var pg=n.page.split('/'), heb=(pnames[pg[0]]||pg[0])+' '+hebNum(pg[1]);
        var cd=el('div','fb-note st-'+n.status), h=el('div','fb-note-h');
        var a=el('a',null,'מסכת '+heb+(n.section_title?' · '+n.section_title:''));a.href='/'+n.page+'/'+(n.section?'#'+pg[0]+pg[1]+'-'+n.section:'');
        h.append(a,el('span',null,KN[n.kind]||''),el('span',null,(n.updated_at||'').slice(0,10)));
        cd.append(h);
        if(n.text)cd.append(el('p','fb-note-t',n.text));
        cd.append(el('p','fb-note-s',ST[n.status]||n.status));
        if(n.reply)cd.append(el('p','fb-note-r',n.reply));
        pl2.append(cd);
      });
    }).catch(function(){pl2.innerHTML='';pl2.append(el('p','fb-muted','לא ניתן לטעון כרגע. נסו שוב מאוחר יותר.'))});
    return;
  }

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
        function go(){var id=window.turnstile.render(box,{sitekey:c.sitekey,language:'he',size:'flexible',appearance:'interaction-only'});res(id)}
        if(window.turnstile) return go();
        var s=document.createElement('script');s.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';s.async=true;s.onload=go;s.onerror=function(){res(null)};document.head.appendChild(s);
      });
    });
  }
  var KINDS=[['fix','תיקון','טעות, ייחוס או ציטוט'],['missing','חסר בדף','סוגיה, שלב או מקור'],['feature','הצעה לאתר','שיפור באתר עצמו']];
  function open(section,title){
    var bg=el('div','srcdlg-bg');
    var d=el('div','srcdlg fb-dlg'); d.setAttribute('role','dialog'); d.setAttribute('aria-modal','true');
    var h=el('header'); var h4=el('h4',null,section?('הערה על: '+title):'הערה על הדף');
    var x=el('button','x','×'); x.type='button'; x.setAttribute('aria-label','סגור'); h.append(h4,x);
    var f=el('form','body fb-form');
    var fs=el('fieldset','fb-kinds'); fs.appendChild(el('legend','fb-sr','סוג ההערה'));
    var ta=el('textarea'); ta.name='text'; ta.required=true; ta.minLength=5; ta.maxLength=2000; ta.rows=8;
    var PH={fix:'מה לא מדויק? כתבו את התיקון, ואם אפשר — ציטוט מהגמרא או מקור.',missing:'מה חסר? איזו סוגיה, שלב או מקור כדאי להוסיף?',feature:'מה היה משפר את האתר בשבילכם?'};
    ta.placeholder=PH.fix;
    KINDS.forEach(function(k,i){var l=el('label','fb-chip'); l.title=k[2]; var r=document.createElement('input'); r.type='radio'; r.name='kind'; r.value=k[0]; if(!i) r.checked=true;
      r.addEventListener('change',function(){ta.placeholder=PH[k[0]]}); l.append(r,el('span',null,k[1])); fs.appendChild(l);});
    var nm=el('input'); nm.name='name'; nm.maxLength=80; nm.placeholder='שם (לא חובה)';
    var em=el('input'); em.name='email'; em.type='email'; em.maxLength=160; em.placeholder='מייל לעדכון (לא חובה)'; em.setAttribute('dir','ltr');
    var nl=el('label','fb-notify'); var nc=document.createElement('input'); nc.type='checkbox'; nc.name='notify';
    nl.append(nc,document.createTextNode(' אשמח לעדכון במייל כשההערה תטופל'));
    em.addEventListener('input',function(){nc.checked=!!em.value.trim()});
    var pl=el('label','fb-notify'); var pc=document.createElement('input'); pc.type='checkbox'; pc.name='public';
    pl.append(pc,document.createTextNode(' אפשר להציג את ההערה בדף ההערות הציבורי (בלי שם ומייל)'));
    var hp=el('input','fb-hp'); hp.name='website'; hp.tabIndex=-1; hp.autocomplete='off'; hp.setAttribute('aria-hidden','true');
    var ts=el('div','fb-ts');
    var note=el('p','fb-muted','ההערה נשלחת באופן אנונימי. המייל משמש רק לעדכון על הטיפול ונמחק אחריו.');
    var who=el('div','fb-who'); who.append(nm,em);
    var st=el('p','fb-status'); st.setAttribute('aria-live','polite');
    var sb=el('button','btn fb-send','שליחה'); sb.type='submit';
    f.append(fs,ta,who,nl,pl,hp,ts,sb,st,note);
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
      fetch('/api/feedback',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({kind:kind,text:ta.value,name:nm.value,email:em.value,notify:nc.checked,public:pc.checked,website:hp.value,turnstile:tok,page:page,section:section||'',sectionTitle:title||''})})
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


/* listen mode: the browser's own Hebrew voice reads the sugyot — title, "בקצרה", then each step — with the
   step being read highlighted. Text is vocalized first with Dicta's Nakdan (modern Hebrew for the explanation,
   rabbinic for Gemara/verse quotes) so the voice reads it right; vocalized text is kept in the browser. */
(function(){
  var art=document.querySelector('article.daf'); if(!art||!('speechSynthesis' in window)) return;
  var ctr=art.querySelector('.controls'); if(!ctr) return;
  var S=window.speechSynthesis, voice=null, P={};
  try{P=JSON.parse(localStorage.getItem('dafPrefs')||'{}')||{}}catch(e){}
  function pick(){ var vs=S.getVoices()||[]; voice=vs.filter(function(v){return /^(he|iw)/i.test(v.lang)}).sort(function(a,b){return (b.localService?1:0)-(a.localService?1:0)})[0]||null; }
  pick(); if(S.onvoiceschanged!==undefined) S.onvoiceschanged=pick;
  var A='\u0001', Z='\u0002';   /* marks a Gemara / verse quote inside the text (rabbinic vocalization) */
  var NUM={'א':1,'ב':2,'ג':3,'ד':4,'ה':5,'ו':6,'ז':7,'ח':8,'ט':9,'י':10,'כ':20,'ל':30,'מ':40,'נ':50,'ס':60,'ע':70,'פ':80,'צ':90,'ק':100,'ר':200,'ש':300,'ת':400};
  function gm(w){ var n=0; for(var k=0;k<w.length;k++) n+=NUM[w[k]]||0; return n; }
  var L='\u0003', R='\u0004';   /* literal (already vocalized) text, not sent to Dicta */
  var LN={'א':'אָלֶף','ב':'בֵּית','ג':'גִּימֶל','ד':'דָּלֶת','ה':'הֵא','ו':'וָו','ז':'זַיִן','ח':'חֵית','ט':'טֵית','י':'יוּד','כ':'כַּף','ל':'לָמֶד','מ':'מֵם','נ':'נוּן','ס':'סָמֶךְ','ע':'עַיִן','פ':'פֵּא','צ':'צָדִי','ק':'קוּף','ר':'רֵישׁ','ש':'שִׁין','ת':'תָּו'};
  function names(w){ return w.split('').map(function(c){return LN[c]||c}).join(' '); }   /* דף יח → "יוּד חֵית", as said in the beit midrash */
  function clean(el){
    var c=el.cloneNode(true);
    c.querySelectorAll('.sec-tools,.fb-sec,.cv,.tn,.pg-mk,.vref,.fb-badge,script').forEach(function(x){x.remove()});
    c.querySelectorAll('.gq,.q-src').forEach(function(q){ if(q.parentNode.closest&&q.parentNode.closest('.gq,.q-src')) return; q.prepend(A); q.append(Z); });
    c.querySelectorAll('p,li,br,div').forEach(function(x){ x.after(' '); });
    return c.textContent.replace(/ה׳/g,'השם').replace(/ע״א/g,'עמוד '+L+'אָלֶף'+R).replace(/ע״ב/g,'עמוד '+L+'בֵּית'+R)
      .replace(/(דף|דפים|דפי|פרק)\s+([א-ת]{0,2})[״׳]?([א-ת])['׳]?(?![א-ת])/g,function(m,w,a,b){ return w+' '+L+names(a+b)+R; })
      .replace(/(^|[\s(—:–-])״([^״\u0001\u0002]{2,}?)״/g,function(m,a,q){ return a+A+q+Z; })
      .replace(/[״׳"]/g,'').replace(/[▤↗←→]/g,'').replace(/\s+/g,' ').trim();
  }
  function plain(t){ return t.replace(/[\u0001-\u0004]/g,''); }
  /* split text into runs: [{t, r:true|false}] (r = rabbinic) */
  function runs(t){ var out=[], cur='', inq=false, lit=false; for(var k=0;k<t.length;k++){ var ch=t[k];
      if(ch===A||ch===Z){ if(cur) out.push({t:cur,r:inq,l:lit}); cur=''; inq=(ch===A); }
      else if(ch===L||ch===R){ if(cur) out.push({t:cur,r:inq,l:lit}); cur=''; lit=(ch===L); }
      else cur+=ch; }
    if(cur) out.push({t:cur,r:inq,l:lit}); return out; }
  /* ---- Dicta Nakdan (simple CORS POST, no preflight) + a per-browser cache ---- */
  var NK_URL='https://nakdan-2-0.loadbalancer.dicta.org.il/api', CK='nk3:'+location.pathname, cache={};
  try{cache=JSON.parse(localStorage.getItem(CK)||'{}')||{}}catch(e){cache={}}
  function saveCache(){ try{localStorage.setItem(CK,JSON.stringify(cache))}catch(e){ try{ Object.keys(localStorage).filter(function(k){return k.indexOf('nk')===0&&k!==CK}).forEach(function(k){localStorage.removeItem(k)}); localStorage.setItem(CK,JSON.stringify(cache)); }catch(e2){} } }
  function nakdan(lines,genre){
    return fetch(NK_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify({task:'nakdan',genre:genre,data:lines.join('\n'),keepmetagim:false,keepqq:true})})
      .then(function(r){ if(!r.ok) throw r.status; return r.json(); })
      .then(function(ws){ var out=ws.map(function(w){ return (w.options&&w.options.length?w.options[0]:w.word); }).join('').split('\n');
        if(out.length!==lines.length) throw 'lines'; return out; });
  }
  /* pronunciation fixes. LEX: words the voice must say one way (sages' names, study terms). Other sages' names
     (from the glossary) are vocalized once in rabbinic mode and used wherever they appear. */
  var LEX={'רבי':'רַבִּי','רב':'רַב','רבה':'רַבָּה','חייא':'חִיָּיא','כהן':'כֹּהֵן','טרפון':'טַרְפוֹן','משנה':'מִשְׁנָה','אמי':'אַמִּי','אסי':'אַסִּי',
    'הונא':'הוּנָא','יוחנן':'יוֹחָנָן','אביי':'אַבַּיֵּי','רבא':'רָבָא','נחמן':'נַחְמָן','יהודה':'יְהוּדָה','מאיר':'מֵאִיר','עקיבא':'עֲקִיבָא',
    'שמעון':'שִׁמְעוֹן','אלעזר':'אֶלְעָזָר','אליעזר':'אֱלִיעֶזֶר','ישמעאל':'יִשְׁמָעֵאל','יוסי':'יוֹסֵי','פפא':'פָּפָּא','אשי':'אָשֵׁי','רבינא':'רָבִינָא',
    'זירא':'זֵירָא','חסדא':'חִסְדָּא','ששת':'שֵׁשֶׁת','יוסף':'יוֹסֵף','אושעיא':'אוֹשַׁעְיָא','חנינא':'חֲנִינָא','גמליאל':'גַּמְלִיאֵל','עמרם':'עַמְרָם',
    'אבהו':'אֲבָהוּ','עולא':'עוּלָּא','שמואל':'שְׁמוּאֵל','יהושע':'יְהוֹשֻׁעַ','ירמיה':'יִרְמְיָה','כהנא':'כָּהֲנָא','אבוה':'אֲבוּהַ','זוטרא':'זוּטְרָא',
    'ברייתא':'בָּרַיְיתָא','גמרא':'גְּמָרָא','תנא':'תַּנָּא','מימרא':'מֵימְרָא','רישא':'רֵישָׁא','סיפא':'סֵיפָא','תיובתא':'תְּיוּבְתָּא','איבעיא':'אִיבַּעְיָא',
    'קושיה':'קֻשְׁיָה','תירוץ':'תֵּרוּץ','בכור':'בְּכוֹר','בכורה':'בְּכוֹרָה','דרשה':'דְּרָשָׁה','מסקנה':'מַסְקָנָה','סוגיה':'סוּגְיָה','בהמה':'בְּהֵמָה','מתניתין':'מַתְנִיתִין'};
  /* study terms (prefixes take the article: לַכֹּהֵן, בַּבָּרַיְיתָא); found by comparing Dicta's modern and rabbinic readings of our pages */
  var TERMS={'רשי':'רַשִׁי','פטורין':'פְּטוּרִין','נפדין':'נִפְדִּין','תמימין':'תְּמִימִין','טעמא':'טַעְמָא','איידי':'אַיְּידֵי','אימא':'אֵימָא','ליה':'לֵיהּ',
    'נימא':'נֵימָא','לימא':'לֵימָא','ואיבעית':'וְאִיבָּעֵית','דאמרי':'דְּאָמְרִי','מינה':'מִינַּהּ','לן':'לַן','הכי':'הָכִי','מאן':'מַאן','תנן':'תְּנַן','תניא':'תַּנְיָא',
    'שדינן':'שָׁדֵינַן','אלימא':'אַלִּימָא','עורפין':'עוֹרְפִין','משמנין':'מְשַׁמְּנִין','דוקין':'דֻּקִּין','שבעין':'שֶׁבָּעַיִן','מית':'מִית','אונסא':'אוּנְסָא',
    'מדף':'מִדַּף','חטאות':'חַטָּאוֹת','פוטר':'פּוֹטֵר','פטור':'פָּטוּר','ראיה':'רְאָיָה','שאלה':'שְׁאֵלָה','נשנה':'נִשְׁנָה','עגלה':'עֶגְלָה','פשיטא':'פְּשִׁיטָא',
    'צריכא':'צְרִיכָא','איכא':'אִיכָּא','איתמר':'אִיתְּמַר','מיתיבי':'מֵיתִיבֵי','תיקו':'תֵּיקוּ','רבנן':'רַבָּנַן','דרבנן':'דְּרַבָּנַן','דאורייתא':'דְּאוֹרַיְיתָא',
    'מום':'מוּם','מוקדשין':'מֻקְדָּשִׁין','הקדש':'הֶקְדֵּשׁ','תמורה':'תְּמוּרָה','ולד':'וָלָד','ולדות':'וְלָדוֹת','נדמה':'נִדְמֶה'};
  ['ברייתא','גמרא','תנא','מימרא','רישא','סיפא','תיובתא','איבעיא','קושיה','תירוץ','בכור','בכורה','דרשה','מסקנה','סוגיה','בהמה','משנה','מתניתין','כהן'].forEach(function(k){ TERMS[k]=LEX[k]; });
  Object.keys(TERMS).forEach(function(k){ LEX[k]=TERMS[k]; });
  var NAMEW={}; try{ var GL=JSON.parse(document.getElementById('glossary').textContent);
    Object.keys(GL).forEach(function(k){ if(GL[k].t==='תנא'||GL[k].t==='אמורא') k.split(/\s+/).forEach(function(w){ if(w.length>1&&!LEX[w]&&!/[״׳]/.test(w)) NAMEW[w]=1; }); }); }catch(e){}
  function bare(w){ return w.replace(/[֑-ׇ]/g,''); }
  function fix(v){   /* v: Dicta output with prefix|stem marks → apply LEX / name vocalizations to the stem */
    return v.replace(/[א-ת֑-ׇ|]+/g,function(tok){ var parts=tok.split('|'), stem=parts.pop(), b=bare(stem);
      var r=LEX[b]||cache['n:'+b]; if(r) return parts.join('')+r;
      /* Dicta read a prefixed form as one word (לכהן → לְכַהֵן): split the prefix ourselves */
      if(!parts.length&&b.length>2&&/^[והבכלמשד]/.test(b)){ var rest=b.slice(1), rv=LEX[rest]||cache['n:'+rest];
        if(rv){ var nm=!(rest in TERMS);
          var PF=nm?{'ו':'וְ','ה':'הַ','ב':'בְּ','כ':'כְּ','ל':'לְ','מ':'מֵ','ש':'שֶׁ','ד':'דְּ'}:{'ו':'וְ','ה':'הַ','ב':'בַּ','כ':'כַּ','ל':'לַ','מ':'מֵ','ש':'שֶׁ','ד':'דְּ'};
          return PF[b[0]]+rv; } }
      return parts.join('')+stem; });
  }
  function vocalize(items){
    var need={m:[],r:[]};
    var names=[];
    items.forEach(function(it){ if(it.say) return; (it.text.match(/[\u05D0-\u05EA]+/g)||[]).forEach(function(w){ [w,w.slice(1)].forEach(function(x){ if(NAMEW[x]&&!(('n:'+x) in cache)&&names.indexOf(x)<0) names.push(x); }); }); });
    items.forEach(function(it){ if(it.say) return; it.rs=it.rs||runs(it.text); it.rs.forEach(function(x){ if(x.l) return; var k=(x.r?'r:':'m:')+x.t.trim(); if(x.t.trim()&&!(k in cache)&&need[x.r?'r':'m'].indexOf(x.t.trim())<0) need[x.r?'r':'m'].push(x.t.trim()); }); });
    function batch(list,genre){ var jobs=[], cur=[], len=0; list.forEach(function(t){ if(len+t.length>2500&&cur.length){ jobs.push(cur); cur=[]; len=0; } cur.push(t); len+=t.length+1; }); if(cur.length) jobs.push(cur);
      return Promise.all(jobs.map(function(j){ return nakdan(j,genre).then(function(v){ j.forEach(function(t,i){ cache[(genre==='rabbinic'?'r:':'m:')+t]=v[i]; }); }); })); }
    var namesP=names.length?nakdan(names,'rabbinic').then(function(v){ names.forEach(function(w,i){ cache['n:'+w]=(v[i]||'').replace(/\|/g,'').trim(); }); }).catch(function(){}):Promise.resolve();
    return Promise.all([namesP,batch(need.m,'modern'),batch(need.r,'rabbinic')]).then(function(){ saveCache(); },function(){ saveCache(); throw 'nk'; })
      .then(function(){ items.forEach(function(it){ it.say=it.rs.map(function(x){ if(x.l) return x.t; var v=cache[(x.r?'r:':'m:')+x.t.trim()]; return v?x.t.replace(x.t.trim(),fix(v).replace(/\|/g,'')):x.t; }).join(''); }); });
  }
  /* reading queue: one entry per element; long texts are split at sentence ends when spoken (some engines stop after ~15s) */
  function chunks(t){ var out=[], cur=''; t.split(/(?<=[.?!:;])\s+/).forEach(function(s){ if((cur+' '+s).length>220&&cur){out.push(cur); cur=s} else cur=(cur+' '+s).trim(); }); if(cur) out.push(cur); return out; }
  var Q=[];
  art.querySelectorAll('section.sugya').forEach(function(sec,si){
    var h=sec.querySelector('h3'), fl=sec.querySelector('.explain.flow'), add=function(el,t,lead){ if(t) Q.push({el:el,sec:sec,si:si,text:(lead||'')+t}); };
    if(!sec.querySelector('ol.steps')&&!fl) return;
    if(h) add(h,clean(h),'סוגיה. ');
    if(fl) add(fl,clean(fl),'בקצרה. ');
    sec.querySelectorAll('ol.steps > li').forEach(function(li){
      var tg=li.querySelector('.tag'), bd=li.querySelector('.body'); if(!bd) return;
      add(li, clean(bd), tg?plain(clean(tg)).replace(/\d.*$/,'').trim()+'. ':'');
    });
  });
  if(!Q.length) return;
  var secQ={}; Q.forEach(function(q){ (secQ[q.si]=secQ[q.si]||[]).push(q); });
  var nkP={}, nkOff=false;
  function ready(si){ if(!secQ[si]||nkOff) return Promise.resolve(); return nkP[si]||(nkP[si]=vocalize(secQ[si]).catch(function(){ nkOff=true; st.textContent='ללא ניקוד (אין חיבור לדיקטה)'; })); }
  /* a 🔊 on each sugya (in its amud row): read from that sugya on */
  var secBtns=[];
  art.querySelectorAll('section.sugya').forEach(function(sec,si){
    if(!secQ[si]) return; var host=sec.querySelector(':scope > .amud')||sec.querySelector('h3'); if(!host) return;
    var sb=document.createElement('button'); sb.type='button'; sb.className='tts-sec'; sb.textContent='🔊'; sb.title='הקראת הסוגיה בקול'; sb.setAttribute('aria-label','הקראת הסוגיה בקול');
    sb.addEventListener('click',function(e){ e.preventDefault(); e.stopPropagation(); startAt(si); });
    host.insertBefore(sb, host.querySelector('.amud-t')?host.querySelector('.amud-t').nextSibling:host.firstChild); secBtns.push(sb);
  });
  var bar=document.createElement('div'); bar.className='tts-bar'; bar.hidden=true; bar.setAttribute('role','region'); bar.setAttribute('aria-label','הקראה');
  bar.innerHTML='<button type="button" data-a="prev" aria-label="הסוגיה הקודמת">⏭</button><button type="button" data-a="play" class="tts-main" aria-label="השהה">⏸</button><button type="button" data-a="next" aria-label="הסוגיה הבאה">⏮</button>'+
    '<span class="tts-st" aria-live="polite"></span><select data-a="rate" aria-label="מהירות"><option value="0.8">0.8×</option><option value="1">1×</option><option value="1.2">1.2×</option><option value="1.5">1.5×</option></select><button type="button" data-a="close" aria-label="סגור">×</button>';
  document.body.appendChild(bar);
  var st=bar.querySelector('.tts-st'), main=bar.querySelector('.tts-main'), rate=bar.querySelector('select');
  rate.value=String(P.ttsRate||1); if(!rate.value) rate.value='1';
  var i=0, playing=false, gen=0, lastEl=null;
  function mark(it){
    if(lastEl&&lastEl!==it.el) lastEl.classList.remove('tts-on');
    it.el.classList.add('tts-on'); if(lastEl!==it.el){ var d=it.el.closest('details'); if(d&&!d.open) d.open=true; it.el.scrollIntoView({block:'center',behavior:'smooth'}); }
    lastEl=it.el;
    var steps=it.sec.querySelectorAll('ol.steps > li'), k=[].indexOf.call(steps,it.el);
    st.textContent='סוגיה '+(it.si+1)+(k>=0?' · שלב '+(k+1):'')+(nkOff?' · ללא ניקוד':'');
  }
  var j=0;
  function speak(){
    if(!playing) return;
    if(i>=Q.length){ stop(); st.textContent='סוף הדף'; return; }
    var it=Q[i], my=++gen; mark(it);
    ready(it.si+1);                                       /* vocalize the next sugya while this one is read */
    ready(it.si).then(function(){
      if(my!==gen||!playing) return;
      var parts=chunks(plain(it.say||it.text));
      if(j>=parts.length){ j=0; i++; return speak(); }
      var u=new SpeechSynthesisUtterance(parts[j]); u.lang='he-IL'; if(voice) u.voice=voice; u.rate=+rate.value||1;
      u.onend=function(){ if(my!==gen) return; j++; speak(); };
      u.onerror=function(e){ if(my!==gen||e.error==='interrupted'||e.error==='canceled') return; j++; speak(); };
      S.speak(u);
    });
  }
  function play(){ playing=true; main.textContent='⏸'; main.setAttribute('aria-label','השהה'); S.cancel(); speak(); }
  function pause(){ playing=false; gen++; S.cancel(); main.textContent='▶'; main.setAttribute('aria-label','המשך'); }
  function stop(){ pause(); if(lastEl) lastEl.classList.remove('tts-on'); lastEl=null; }
  function jump(dir){ var si=Q[Math.min(i,Q.length-1)].si+dir; var n=Q.findIndex(function(q){return q.si===si}); if(n<0) return; i=n; j=0; if(playing) play(); else mark(Q[i]); }
  function fromView(){ var secs=art.querySelectorAll('section.sugya'); for(var k=0;k<secs.length;k++){ if(secs[k].getBoundingClientRect().bottom>innerHeight*0.3){ var n=Q.findIndex(function(q){return q.sec===secs[k]}); return n<0?0:n; } } return 0; }
  function startAt(si){
    var n=Q.findIndex(function(q){return q.si===si}); if(n<0) return;
    if(!bar.hidden&&playing&&Q[i]&&Q[i].si===si){ pause(); return; }
    bar.hidden=false; document.body.classList.add('tts-open'); i=n; j=0; play();
    if(!voice) setTimeout(function(){ if(!voice) st.textContent='אין קול עברי מותקן במכשיר — אפשר להוסיף בהגדרות המכשיר'; },1500);
  }
  bar.addEventListener('click',function(e){ var a=e.target.closest('[data-a]'); if(!a) return; var w=a.dataset.a;
    if(w==='play') playing?pause():play(); else if(w==='next') jump(1); else if(w==='prev') jump(-1);
    else if(w==='close'){ stop(); bar.hidden=true; document.body.classList.remove('tts-open'); } });
  rate.addEventListener('change',function(){ try{P=JSON.parse(localStorage.getItem('dafPrefs')||'{}')||{}; P.ttsRate=+rate.value; localStorage.setItem('dafPrefs',JSON.stringify(P))}catch(e){} if(playing) play(); });
  /* tap a step while the bar is open → read from there */
  art.addEventListener('click',function(e){ if(bar.hidden||e.target.closest('button,a,.gq,.term')) return; var li=e.target.closest('ol.steps > li'); if(!li) return; var n=Q.findIndex(function(q){return q.el===li}); if(n>=0){ i=n; j=0; play(); } });
  window.addEventListener('pagehide',function(){ S.cancel(); });
})();
