/* shared study-page runtime: glossary, sources, tree, chavruta, settings, quiz */
(function(){
  var G={}; try{G=JSON.parse(document.getElementById('glossary').textContent)}catch(e){}
  var H='\u05d0-\u05ea';
  var keys=Object.keys(G).sort(function(a,b){return b.length-a.length});
  function esc(k){return k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}
  var reG=keys.length?new RegExp('(^|[^'+H+'])([והבכלמשד]{0,2})('+keys.map(esc).join('|')+')(?!['+H+'])'):null;
  var NUM={'א':1,'ב':2,'ג':3,'ד':4,'ה':5,'ו':6,'ז':7,'ח':8,'ט':9,'י':10,'כ':20,'ך':20,'ל':30,'מ':40,'ם':40,'נ':50,'ן':50,'ס':60,'ע':70,'פ':80,'ף':80,'צ':90,'ץ':90,'ק':100,'ר':200,'ש':300,'ת':400};
  function gem(w){var n=0;for(var i=0;i<w.length;i++){n+=NUM[w[i]]||0}return n}
  var BOOKS={'בראשית':'Genesis','שמות':'Exodus','ויקרא':'Leviticus','במדבר':'Numbers','דברים':'Deuteronomy','משלי':'Proverbs','ישעיהו':'Isaiah','תהלים':'Psalms','עזרא':'Ezra','נחמיה':'Nehemiah','יחזקאל':'Ezekiel','ירמיהו':'Jeremiah','שמואל א':'I_Samuel','שמואל ב':'II_Samuel','מלכים א':'I_Kings','מלכים ב':'II_Kings','דברי הימים א':'I_Chronicles','דברי הימים ב':'II_Chronicles','יהושע':'Joshua','שופטים':'Judges','הושע':'Hosea','יואל':'Joel','עמוס':'Amos','מיכה':'Micah','חבקוק':'Habakkuk','זכריה':'Zechariah','מלאכי':'Malachi','איוב':'Job','קהלת':'Ecclesiastes','איכה':'Lamentations','אסתר':'Esther','דניאל':'Daniel','רות':'Ruth','שיר השירים':'Song_of_Songs'};
  var SEF='https://www.sefaria.org/';
  var RULES=[
    {re:new RegExp('('+Object.keys(BOOKS).sort(function(a,b){return b.length-a.length}).join('|')+')\\s+(['+H+']{1,3})[׳\']?,\\s*(['+H+']{1,3})[׳\']?'),url:function(m){return SEF+BOOKS[m[1]]+'.'+gem(m[2])+'.'+gem(m[3])+'?lang=he'}},
    {re:new RegExp('שו״ע יו״ד (['+H+']{1,3}), (['+H+']{1,3})'),url:function(m){return SEF+"Shulchan_Arukh,_Yoreh_De'ah."+gem(m[1])+'.'+gem(m[2])+'?lang=he'}},
    {re:new RegExp('רמב״ם מאכלות אסורות (['+H+']{1,3}), (['+H+']{1,3})'),url:function(m){return SEF+'Mishneh_Torah,_Forbidden_Foods.'+gem(m[1])+'.'+gem(m[2])+'?lang=he'}}
  ];
  var SKIP='A,BUTTON,H1,H3,SCRIPT,.quiz,.map,.tag,.fb,footer,.term,.links,.card,.meta,details.storyline,details.flowd,.nogl,svg,.topnav,.dnav,.eyebrow,.pager,.tmeta,.perek';
  function textNodes(root){var out=[],w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:function(n){var p=n.parentElement;if(!p||!n.nodeValue.trim())return 2;return p.closest(SKIP)?2:1}});while(w.nextNode())out.push(w.currentNode);return out}
  function mkSrc(url,text){
    var key=decodeURIComponent(url.replace(SEF,'').split('?')[0]), el;
    var S=window.__SRC||{};
    if(S[key]){ el=document.createElement('button'); el.type='button'; el.className='src'; el.dataset.ref=key; el.dataset.url=url; }
    else { el=document.createElement('a'); el.className='src'; el.href=url; el.target='_blank'; el.rel='noopener'; }
    el.textContent=text; return el;
  }
  var LW=new RegExp('['+H+']');
  function linkify(art){
    textNodes(art).forEach(function(n){
      var guard=0;
      while(n&&guard++<20){
        var best=null,br=null;
        RULES.forEach(function(r){var v=n.nodeValue, g=new RegExp(r.re.source,'g'), m; while((m=g.exec(v))){ if(!LW.test(v.charAt(m.index-1)||' ')&&!LW.test(v.charAt(m.index+m[0].length)||' ')&&!(r===RULES[0]&&(gem(m[2])>150||gem(m[3])>176))) break; g.lastIndex=m.index+1; } if(m&&(!best||m.index<best.index)){best=m;br=r}});   /* whole words only: ״מדברים שוא, ואין״ is not a verse reference */
        if(!best) break;
        var a=mkSrc(br.url(best),best[0]);
        var mid=n.splitText(best.index); var rest=mid.splitText(best[0].length); mid.parentNode.replaceChild(a,mid); n=rest;
      }
    });
  }
  /* audit 2026-10-27: a marked word whose sense doesn't fit the sentence. Generic rules, then per-term "x" (contexts to skip) */
  var PERSON={'תנא':1,'אמורא':1,'חכם':1}, LONGER={};
  Object.keys(G).forEach(function(k){ Object.keys(G).forEach(function(l){ if(l!==k&&l.length>k.length&&(' '+l+' ').indexOf(' '+k+' ')>=0) (LONGER[k]=LONGER[k]||[]).push(l); }); });
  function glossWrong(k,v,m){
    var st=m.index+m[1].length, en=st+m[2].length+k.length, before=v.slice(Math.max(0,st-40),st), after=v.slice(en,en+40), win=before+m[2]+k+after;
    if((LONGER[k]||[]).some(function(l){ return win.indexOf(l)>=0; })) return true;             /* part of a longer known term (״הלל״ in ״בית הלל״) */
    if(/(?:^|[^א-ת])(?:מסכת|למסכת|במסכת)\s*$/.test(before)) return true;                         /* a tractate name */
    if(/^\s+[א-ת]{1,3}[׳״']?\s*(?:ע״[אב]|,\s*[א-ת])/.test(after)&&!PERSON[G[k].t]) return true;   /* a citation: ״(נדה ג, ד)״, ״תמורה יא ע״ב״ */
    if(PERSON[G[k].t]){
      if(/(?:בן|בר|ב״ר|בריה\s+ד|בנו\s+של|אבי)\s*$/.test(before)) return true;                  /* a father's name inside a longer name */
      if(m[2].indexOf('ב')>=0&&/^רבי?\s/.test(k)) return true;                                     /* ״ברבי X״ = son of */
      if(/^\s+(?:בן|בר|ב״ר|ברבי|בריה|בנו\s+של|אבי)\s/.test(after)) return true;                   /* only the first part of a longer name */
    }
    var x=G[k].x; if(x) for(var i=0;i<x.length;i++) if(new RegExp(x[i]).test(win)) return true;
    return false;
  }
  function glossify(art){
    if(!reG) return; var seen={};
    var meta=art.querySelector('header .meta'); if(meta&&!art.querySelector('.legend')){var lg=document.createElement('div'); lg.className='legend'; lg.innerHTML='<span>הקש על מילה מסומנת להסבר קצר:</span><span><span class="lp">חכם</span> — תנא או אמורא</span><span><span class="lt">מושג</span> — מונח, מקום או דין</span>'; meta.after(lg);}
    textNodes(art).forEach(function(n){
      var guard=0;
      while(n&&guard++<20){
        var v=n.nodeValue, re=new RegExp(reG.source,'g'), m, hit=null;
        while((m=re.exec(v))){var k=m[3]; if(seen[k]) continue; if((G[k].np||(k.length<=4&&G[k].t!=='תנא'&&G[k].t!=='אמורא'))&&m[2]&&!G[k].pf) continue;   /* a prefix + short term is usually another word (ב+ציר = בציר, מ+שוער = משוער) */ if(glossWrong(k,v,m)) continue; hit=m; break}
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
        if(open<0){ if(nl&&(!pl||/[ומשהכלב]/.test(flat[i-1])&&!HL.test(flat[i-2]||' ')&&HL.test(flat[i+2]||' '))) open=i; }  /* כ״ה, ש״מ: a number or abbreviation, not a quote */
        else if(pl||/[?!.׳]/.test(flat[i-1])){ if(!nl){ pairs.push([open,i]); open=-1; } }
      }
      for(var k=pairs.length-1;k>=0;k--){
        var a=pairs[k][0], b=pairs[k][1], after=flat.slice(b+1), vm=after.match(VREF);
        var txt=flat.slice(a+1,b); if(!vm&&(txt.split(/\s+/).length<2||!body.closest('section.sugya'))) continue;
        if(!vm&&/^הדרן\s/.test(txt)) continue;  /* ״הדרן עלך…״ only closes the chapter: Steinsaltz and Rashi just repeat it */
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
        if(sb.tagName==='BUTTON'){var st=mkSrc(SEF+el.dataset.ref+'?lang=he','שטיינזלץ'); st.dataset.st='1'; st.classList.add('st'); if(st.tagName==='BUTTON'){st.setAttribute('aria-label','שטיינזלץ'); st.textContent='שטיינזלץ'} el.appendChild(st);
          var rs=mkSrc(SEF+el.dataset.ref+'?lang=he','רש״י'); rs.dataset.rs='1'; rs.classList.add('st'); el.appendChild(rs)} return;}
      var t=el.textContent, m=t.match(new RegExp('\\((['+H+']{1,3})([.:])\\)')), ref=null;
      if(m){ref=tr+'.'+gem(m[1])+(m[2]===':'?'b':'a')}
      else{var a=t.match(/עמוד ([אב])/); if(a) ref=tr+'.'+daf+(a[1]==='א'?'a':'b')}
      if(!ref) return;
      var l=document.createElement('a'); l.className='src'; l.href=SEF+ref+'?lang=he'; l.target='_blank'; l.rel='noopener'; l.textContent='לשון הגמרא'; el.appendChild(l);
    });
    var meta=art.querySelector('header .meta');
    if(meta&&!art.querySelector('.sefaria-bar,.tmeta')){var d=document.createElement('div'); d.className='sefaria-bar'; d.innerHTML='<a class="src" target="_blank" rel="noopener" href="'+SEF+tr+'.'+daf+'a?lang=he">פתח את הדף בספריא</a>'; meta.after(d)}
  }
  var pop=document.createElement('div'); pop.className='pop'; pop.hidden=true; pop.setAttribute('role','dialog'); document.body.appendChild(pop); var cur=null; window.__dafPop=pop;
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
    return {ch:ch, bw:bw, seg:seg};
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
  /* מורחב: under each step, the Gemara line it explains (its data-seg) and Steinsaltz on that line, from Sefaria */
  var DS={};
  function amudTexts(r){ return DS[r]||(DS[r]=Promise.all([getJ(SEF+'api/texts/'+r+'?lang=he&context=0&commentary=0'),getJ(SEF+'api/texts/Steinsaltz_on_'+r+'?lang=he&context=0&pad=0')])
    .then(function(x){return {g:x[0].he||[], s:x[1].he||[]}}).catch(function(e){delete DS[r]; throw e})); }
  function safeInto(el,html){ var doc=new DOMParser().parseFromString('<div>'+(html||'')+'</div>','text/html');
    (function walk(src,dst){ [].forEach.call(src.childNodes,function(n){ if(n.nodeType===3) dst.appendChild(document.createTextNode(n.nodeValue));
      else if(n.nodeType===1){ if(n.tagName==='B'||n.tagName==='STRONG'){var b=document.createElement('b'); dst.appendChild(b); walk(n,b);} else if(n.tagName==='BR') dst.appendChild(document.createElement('br')); else walk(n,dst);} }); })(doc.body.firstChild, el); }
  window.dafDeep=function(art,on){
    art.classList.toggle('lvl-deep',!!on); if(!on||art.dataset.deepDone) return; art.dataset.deepDone='1';
    var tr=art.dataset.tractate;
    art.querySelectorAll('ol.steps').forEach(function(ol){ var prev=null;
      [].forEach.call(ol.children,function(li){ var sg=li.dataset.seg; if(!sg||sg===prev) return; prev=sg;
        var m=sg.match(/^(\d+[ab])\.(\d+)$/); if(!m) return;
        var box=document.createElement('div'); box.className='seg-src';
        var g=document.createElement('p'); g.className='seg-gm'; g.textContent='טוען את לשון הגמרא…';
        var st=document.createElement('details'); st.className='seg-st'; var su=document.createElement('summary'); su.textContent='ביאור שטיינזלץ לשורה זו'; var sp=document.createElement('p'); st.append(su,sp);
        box.append(g,st); li.appendChild(box);
        amudTexts(tr+'.'+m[1]).then(function(t){ var i=+m[2]-1; if(!t.g[i]){ box.remove(); return; } g.textContent=''; safeInto(g,t.g[i]); if(t.s[i]) safeInto(sp,t.s[i]); else st.remove(); })
          .catch(function(){ g.textContent=''; var a=document.createElement('a'); a.href=SEF+tr+'.'+sg+'?lang=he'; a.target='_blank'; a.rel='noopener'; a.textContent='לשון הגמרא בספריא ↗'; g.appendChild(a); st.remove(); });
      });
    });
  };
  /* Steinsaltz for a whole stage (שלב) of a long sugya: every Gemara line of the stage with its Steinsaltz, in a dialog */
  window.dafStageSt=function(sec,i,title){
    var art=sec.closest('article.daf'), tr=art.dataset.tractate, segs=[];
    sec.querySelectorAll('ol.steps > li[data-stg="'+i+'"][data-seg]').forEach(function(li){ var g=li.dataset.seg; if(/^\d+[ab]\.\d+$/.test(g)&&segs.indexOf(g)<0) segs.push(g); });
    if(!segs.length) return;
    var last=document.activeElement, bg2=document.createElement('div'); bg2.className='srcdlg-bg';
    var d=document.createElement('div'); d.className='srcdlg gem'; d.setAttribute('role','dialog'); d.setAttribute('aria-modal','true');
    var h=document.createElement('header'), h4=document.createElement('h4'), x=document.createElement('button'); h4.textContent='שטיינזלץ · '+title; x.type='button'; x.className='x'; x.setAttribute('aria-label','סגור'); x.textContent='×'; h.append(h4,x);
    var b=document.createElement('div'); b.className='body'; var ld=document.createElement('p'); ld.className='gap'; ld.textContent='טוען את ביאור שטיינזלץ…'; b.appendChild(ld);
    var f=document.createElement('footer'), sp=document.createElement('span'), l=document.createElement('a'); sp.textContent='ביאור שטיינזלץ · CC-BY-NC · ספריא';
    l.className='src'; l.dataset.external='1'; l.target='_blank'; l.rel='noopener'; l.textContent='פתח בספריא'; l.href=SEF+tr+'.'+segs[0]+(segs.length>1?'-'+(segs[segs.length-1].split('.')[0]===segs[0].split('.')[0]?segs[segs.length-1].split('.')[1]:segs[segs.length-1]):'')+'?lang=he&with=Steinsaltz';
    f.append(sp,l); d.append(h,b,f); bg2.appendChild(d); document.body.appendChild(bg2);
    function close(){ bg2.remove(); document.removeEventListener('keydown',esc); if(last&&last.focus) last.focus(); }
    function esc(e){ if(e.key==='Escape') close(); }
    x.onclick=close; bg2.addEventListener('click',function(e){ if(e.target===bg2) close(); }); document.addEventListener('keydown',esc); x.focus();
    var ams=[]; segs.forEach(function(g){ var a=g.split('.')[0]; if(ams.indexOf(a)<0) ams.push(a); });
    /* three views of the same lines: Steinsaltz (default) · Rashi · the Gemara text */
    var MODES=[['gem','גמרא'],['st','שטיינזלץ'],['rashi','רש״י']], tabs={}, mode='st', row=document.createElement('div'); row.className='stg-tabs'; row.setAttribute('role','tablist');
    MODES.forEach(function(m){ var t=document.createElement('button'); t.type='button'; t.className='st-tog'; t.textContent=m[1]; t.setAttribute('aria-pressed',m[0]===mode);
      t.onclick=function(){ show(m[0]); }; tabs[m[0]]=t; row.appendChild(t); });
    h.after(row);
    var TX=null, RSX=null;
    function getTx(){ return TX||(TX=Promise.all(ams.map(function(a){ return amudTexts(tr+'.'+a); }))); }
    function getRs(){ return RSX||(RSX=Promise.all(ams.map(function(a){ return loadRashi(tr+'.'+a).catch(function(){return []}); }))); }
    function show(m){ mode=m; MODES.forEach(function(x){ tabs[x[0]].setAttribute('aria-pressed',x[0]===m); });
      h4.textContent=(m==='st'?'שטיינזלץ':m==='rashi'?'רש״י':'לשון הגמרא')+' · '+title;
      sp.textContent=m==='st'?'ביאור שטיינזלץ · CC-BY-NC · ספריא':m==='rashi'?'רש״י · ספריא':'לשון הגמרא · ספריא';
      b.innerHTML=''; var l2=document.createElement('p'); l2.className='gap'; l2.textContent='טוען…'; b.appendChild(l2);
      (m==='rashi'?Promise.all([getTx(),getRs()]):getTx().then(function(t){return [t,null]})).then(function(r){ if(mode!==m) return; b.innerHTML='';
        segs.forEach(function(g){ var a=g.split('.')[0], ai=ams.indexOf(a), t=r[0][ai], k=+g.split('.')[1]-1;
          if(m==='rashi'){ var cm=((r[1][ai]||[])[k]||[]); cm=(Array.isArray(cm)?cm:[cm]).filter(Boolean);
            cm.forEach(function(c){ var q=document.createElement('p'); safeInto(q,String(c)); b.appendChild(q); }); return; }
          var p=document.createElement('p'); if(m==='gem'){ p.className='stg-gm'; safeInto(p,t.g[k]||''); } else safeInto(p,t.s[k]||t.g[k]||''); b.appendChild(p); });
        if(!b.childNodes.length){ var e=document.createElement('p'); e.className='gap'; e.textContent=m==='rashi'?'אין רש״י על שורות השלב.':'אין טקסט.'; b.appendChild(e); }
      }).catch(function(){ l2.textContent='לא ניתן לטעון מספריא כרגע.'; });
    }
    show('st');
  };
  var RS={};
  function loadRashi(amud){ return RS[amud]||(RS[amud]=getJ(SEF+'api/texts/Rashi_on_'+amud+'?lang=he&context=0&pad=0').then(function(x){return x.he||[]}).catch(function(e){delete RS[amud]; throw e})); }
  function cmtPref(){ try{ var P=JSON.parse(localStorage.getItem('dafPrefs')||'{}')||{}; return P.rashi?'rashi':'st'; }catch(e){ return 'st'; } }
  function setCmtPref(m){ try{ var P=JSON.parse(localStorage.getItem('dafPrefs')||'{}')||{}; P.rashi=(m==='rashi'); localStorage.setItem('dafPrefs',JSON.stringify(P)); }catch(e){} document.dispatchEvent(new CustomEvent('daf:cmt',{detail:m})); }
  /* tap a Gemara quote in the steps → Steinsaltz or Rashi for those words (tabs; the default is a setting) */
  function stPop(q,probe){
    var sec=q.closest('section.sugya'), am=sec&&sec.querySelector(':scope > .amud'), key=am&&am.dataset.ref;
    var pop=probe?document.createElement('div'):window.__dafPop;   /* probe: the same search, off-screen, to learn whether Steinsaltz adds anything */
    if(!probe){ closePop(); pop.innerHTML=''; }
    var tabs=document.createElement('div'); tabs.className='cm-tabs'; tabs.setAttribute('role','tablist');
    var T={}; [['st','שטיינזלץ'],['rashi','רש״י']].forEach(function(x){ var t=document.createElement('button'); t.type='button'; t.className='cm-tab'; t.setAttribute('role','tab'); t.textContent=x[1]; t.dataset.m=x[0]; T[x[0]]=t; tabs.appendChild(t); });
    var pd=document.createElement('div'); pd.className='st-pd'; pd.textContent='טוען…';
    var cr=document.createElement('div'); cr.className='st-cr';
    pop.append(tabs,pd,cr);
    if(!probe){ pop.hidden=false; cur=q; q.setAttribute('aria-expanded','true');
    var r=q.getBoundingClientRect(), w=Math.min(340,innerWidth-32); pop.style.width=w+'px';
    var left=Math.max(16,Math.min(innerWidth-w-16, r.left+r.width/2-w/2)); pop.style.left=(left+scrollX)+'px'; pop.style.top=(r.bottom+scrollY+8)+'px'; }
    if(!key){ if(probe) return Promise.resolve(null); pd.textContent='לא נמצא ביאור לציטוט זה.'; return; }
    var full=norm(q.textContent.split(/\.\.\.|…/)[0]), qw=norm(q.textContent).split(' ').filter(Boolean), set={};
    qw.forEach(function(x){ if(x.length>1) set[x]=1; });
    /* the section's own amudim first, then the neighbouring amudim (a sugya often quotes the previous daf) */
    var art=q.closest('article.daf'), tr=art.dataset.tractate, dn=+art.dataset.daf, keys=[key];
    [[dn-1,'b'],[dn,'a'],[dn,'b'],[dn+1,'a']].forEach(function(x){ if(x[0]>1) keys.push(tr+'.'+x[0]+x[1]); });
    /* the section's own Gemara segments (its ref range), searched in the order the steps quote them:
       a phrase that occurs twice (״היינו גוזז״) maps to the occurrence after the previous quote */
    var rm=key.match(/^(.+)\.(\d+[ab])\.(\d+)(?:-(?:(\d+[ab])\.)?(\d+))?$/);
    function inRange(x){ if(!rm) return false; var ea=rm[4]||rm[2], ei=rm[5]?+rm[5]:+rm[3], a=x.a.split('.').pop();
      var after=a!==rm[2]||x.i+1>=+rm[3], before=a!==ea||x.i+1<=ei; return (a===rm[2]||a===ea)&&after&&before; }
    function qtext(el){ return norm(el.textContent.split(/\.\.\.|…/)[0]); }
    function locate(segs){
      var own=segs.filter(inRange), all=[].slice.call(sec.querySelectorAll('.gq')), cs=0, co=0;
      for(var j=0;j<all.length&&all[j]!==q;j++) step(qtext(all[j]));
      return step(full);
      function step(t){
        if(t.length<4) return null;
        for(var x=cs;x<own.length;x++){ var o=own[x].n.indexOf(t,x===cs?co:0); if(o>=0){ cs=x; co=o+t.length; return {seg:own[x],o:o,list:segs}; } }
        for(var y=Math.min(cs,own.length-1);y>=0;y--){ var o2=y===cs?own[y].n.lastIndexOf(t,Math.max(co-t.length-1,0)):own[y].n.lastIndexOf(t); if(o2>=0) return {seg:own[y],o:o2,list:segs}; }
        return null;
      }
    }
    function find(segs,k){
      if(k===0&&sec){ var l=locate(segs); if(l) return l; }
      var probe=full.split(' ').slice(0,3).join(' '), seg=null, o=-1;
      segs.some(function(x){ if(full.length>3&&(o=x.n.indexOf(full))>=0){seg=x;return true} });
      if(!seg&&probe.split(' ').length>=2) segs.some(function(x){ if((o=x.n.indexOf(probe))>=0){seg=x;return true} });
      return seg&&{seg:seg,o:o,list:segs};
    }
    function tryKey(k){
      if(k>=keys.length) return Promise.resolve(null);
      return loadSt(keys[k]).then(function(segs){ return find(segs,k)||tryKey(k+1); }, function(e){ if(k===0) throw e; return tryKey(k+1); });
    }
    var found=tryKey(0), thin=false, rl=null, picked=false;
    function wEq(a,b){ return a===b||a+'בי'===b||b+'בי'===a||(a.length>2&&b.length>2&&(a===b.slice(1)||b===a.slice(1)||a===b.slice(2)||b===a.slice(2))); }  /* ו/ה/ש prefixes; ר׳ for רבי */
    function inQ(w){ return qw.some(function(x){return wEq(x,w)}); }
    /* Steinsaltz: from the bold run holding the quote's first word to the run holding its last word,
       plus the explanation right after it — nothing from neighbouring phrases */
    function showSt(f){
      cr.textContent='ביאור שטיינזלץ · CC-BY-NC · ספריא';
      /* Steinsaltz's segments do not always break where the Gemara's do: look in the neighbours too */
      var li=f.list.indexOf(f.seg), r=0, o=-1;
      if(full.length>3) while((o=f.seg.n.indexOf(full,o+1))>=0&&o<f.o) r++;
      var tries=[[f.seg,r]]; if(li>0&&f.list[li-1].a===f.seg.a) tries.push([f.list[li-1],1e4]); if(li>=0&&li+1<f.list.length) tries.push([f.list[li+1],0]);
      for(var t=0;t<tries.length;t++){ if(stIn(tries[t][0],tries[t][1],t===tries.length-1)) return true; }
      return false;
    }
    function stIn(seg,r,last){
      var parts=String(seg.s||'').replace(/<(?!\/?(b|strong)>)[^>]+>/g,'').split(/<\/?(?:b|strong)>/);
      /* every word with its run and its token index in that run; odd runs are bold (Gemara) */
      var bw=[], sp=parts.map(function(t){ return t.split(/(\s+)/); });
      for(var i=0;i<parts.length;i++) sp[i].forEach(function(tk,z){ norm(tk).split(' ').forEach(function(w){ if(w) bw.push({w:w,i:i,z:z,b:i%2}); }); });
      /* a start: the most quote words in order (Steinsaltz inserts up to a few words between them and
         abbreviates some, כר׳ for כרבי), bold matches first; of equal starts the r-th, as in the Gemara */
      var cands=[], best=0;
      for(var k=0;k<bw.length;k++){ var q0=-1; for(var x=0;x<Math.min(3,qw.length);x++){ if(wEq(qw[x],bw[k].w)){ q0=x; break; } } if(q0<0) continue;
        var n=1, sc=bw[k].b, l=k, miss=q0;
        for(var qi=q0+1;qi<qw.length&&miss<=Math.max(2,qw.length/3);qi++){ var hit=-1; for(var y=l+1;y<bw.length&&y<=l+12;y++){ if(wEq(qw[qi],bw[y].w)){ hit=y; break; } } if(hit<0){ miss++; continue; } n++; sc+=bw[hit].b; l=hit; }
        var score=n*2+sc-miss; if(score>best) best=score; cands.push({k:k,e:l,s:score});
      }
      cands=cands.filter(function(c){ return c.s===best; });
      var c0=cands.length?cands[Math.min(r,cands.length-1)]:null, k0=c0?c0.k:-1, e0=c0?c0.e:-1;
      if(k0<0){ if(last){ pd.textContent='לא נמצא ביאור לציטוט זה.'; if(rl&&rl.length&&!picked) show('rashi'); } return false; }
      var start=bw[k0].i, end=bw[e0].i, stop=end+1, ew=sp[end];
      parts=parts.slice();
      if(end%2){
        /* the end run runs on into the next phrase: cut it at the quote's last word */
        var after=0; for(var y2=bw[e0].z+1;y2<ew.length;y2++){ if(norm(ew[y2])) after++; }
        if(after>3){ parts[end]=ew.slice(0,bw[e0].z+1).join(''); stop=end; }
      } else {
        /* the quote ends in Steinsaltz's own words: keep them to the end of the sentence */
        var rest=ew.slice(bw[e0].z+1).join(''), d0=rest.search(/[.?!]/);
        if(d0>=0){ parts[end]=ew.slice(0,bw[e0].z+1).join('')+rest.slice(0,d0+1); stop=end; }
      }
      /* the start run can hold the end of the previous phrase too: start it at the quote's first word */
      parts[start]=(start===end?(stop===end?parts[end]:ew.join('')).split(/(\s+)/):sp[start]).slice(bw[k0].z).join('');
      /* the explanation after the quote: finish its sentence, and leave out the lead-in to the next phrase */
      if(stop===end+1&&stop<parts.length){
        var tail=parts[stop], dot=Math.max(tail.lastIndexOf('.'),tail.lastIndexOf('?'),tail.lastIndexOf('!'));
        if(/[.?!][\s\)\]]*$/.test(tail)||stop+1>=parts.length){ }
        else if(dot>=0) parts[stop]=tail.slice(0,dot+1);
        else for(var f=stop+1;f<parts.length&&f<=stop+4;f++){ stop=f; var d2=parts[f].search(/[.?!]/); if(d2>=0){ parts[f]=parts[f].slice(0,d2+1); break; } }
      }
      /* Steinsaltz that only repeats the Gemara's words (a stray ה, ״אלו הם״) adds nothing: say so, and open Rashi when there is one */
      var own=0; for(var m0=start;m0<=stop&&m0<parts.length;m0++){ if(!(m0%2)) own+=norm(parts[m0]).split(' ').filter(function(w){return w.length>1}).length; }
      if(own<3){ thin=true; pd.textContent='שטיינזלץ מביא כאן את לשון הגמרא כמות שהיא, בלי ביאור נוסף.'; if(rl&&rl.length&&!picked) show('rashi'); return true; }
      pd.textContent='';
      for(var m=start;m<=stop&&m<parts.length;m++){ var tx=parts[m]; if(!tx) continue;
        if(m%2){ var bb=document.createElement('b'); bb.textContent=tx; pd.appendChild(bb); } else pd.appendChild(document.createTextNode(tx)); }
      return true;
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
        return m==='rashi'?showRashi(seg.seg):showSt(seg);
      }).catch(function(){ if(cur===q) pd.textContent='לא ניתן לטעון מספריא כרגע.'; });
    }
    /* no Steinsaltz passage for the words counts as thin: with no Rashi either, the quote stays plain text */
    if(probe) return found.then(function(seg){ if(!seg) return null; if(!showSt(seg)) thin=true;
      return rashiFor(seg.seg).then(function(l){ return {thin:thin, rashi:l.length}; }, function(){ return {thin:thin, rashi:-1}; }); });
    Object.keys(T).forEach(function(k){ T[k].onclick=function(e){ e.stopPropagation(); picked=true; setCmtPref(k); show(k); }; });
    T.rashi.hidden=true;
    var want=cmtPref();
    found.then(function(seg){ return seg?rashiFor(seg.seg):[]; }).then(function(list){
      if(cur!==q) return;
      rl=list;
      if(list.length){ T.rashi.hidden=false; if(want==='rashi'||(thin&&!picked)) show('rashi'); }
      else if(want==='rashi') show('st');
    }).catch(function(){ if(cur===q&&want==='rashi') show('st'); });
    if(want!=='rashi') show('st'); else pd.textContent='טוען…';
  }
  document.addEventListener('click',function(e){
    if(e.target.closest&&e.target.closest('.info,button,a')) return;
    var q=e.target.closest&&e.target.closest('.gq'); if(!q||q.classList.contains('gq-flat')) return;
    var hl=q.closest('li.ans'); if(hl&&hl.closest('.hide-mode')&&!hl.classList.contains('shown')) return;
    if(cur===q){closePop();return} stPop(q);
  });
  document.addEventListener('keydown',function(e){ if((e.key==='Enter'||e.key===' ')&&e.target.classList&&e.target.classList.contains('gq')&&!e.target.classList.contains('gq-flat')){ e.preventDefault(); stPop(e.target); } });
  /* a Gemara quote that would open no explanation — Steinsaltz only repeats the words and Rashi has nothing, or no
     matching passage was found at all —
     show it as plain לשון הגמרא, not as a link. Checked per sugya as it nears the screen (the same Sefaria data the tap would load). */
  (function(){
    if(!('IntersectionObserver' in window)) return;
    function scan(sec){ var qs=[].slice.call(sec.querySelectorAll('.gq')), i=0;
      (function next(){ if(i>=qs.length) return; var q=qs[i++];
        var p=stPop(q,true); if(!p||!p.then) return next();
        p.then(function(r){ if(window.__dafDbg) console.log('probe',q.textContent.slice(0,20),JSON.stringify(r)); if(r===null||(r.thin&&r.rashi===0)){ q.classList.add('gq-flat'); q.removeAttribute('role'); q.removeAttribute('tabindex'); q.removeAttribute('title'); } }, function(){}).then(next); })(); }
    var io=new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ io.unobserve(e.target); scan(e.target); } }); },{rootMargin:'800px 0px'});
    function go(){ document.querySelectorAll('article.daf section.sugya').forEach(function(s){ if(s.querySelector('.gq')) io.observe(s); }); }
    setTimeout(go,300);
  })();
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
    var stFirst=isGem&&!!(a.dataset.st||a.dataset.rs), hold=stFirst?document.createDocumentFragment():b;
    (it.p||[]).forEach(function(t){var p=document.createElement('p'); if(t==='…'){p.className='gap'; var gl=document.createElement('a'); gl.href=a.dataset.url; gl.target='_blank'; gl.rel='noopener'; gl.dataset.external='1'; gl.textContent='… המשך לשון הגמרא בספריא ↗'; p.appendChild(gl)}
      else if(isGem){ t.split(/(\s+)/).forEach(function(w){ if(/\S/.test(w)){var sp=document.createElement('span'); sp.className='w'; sp.textContent=w; p.appendChild(sp)} else p.appendChild(document.createTextNode(w)) }); paras.push({el:p,text:t}) }
      else p.textContent=t;
      hold.appendChild(p)});
    if(stFirst){var ld=document.createElement('p'); ld.className='gap'; ld.textContent='טוען ביאור…'; b.appendChild(ld)}
    var flush=function(){ if(hold!==b){ b.replaceChildren(hold); hold=b } };
    var f=document.createElement('footer'); var sp=document.createElement('span'); sp.textContent='הטקסט מתוך ספריא'; var l=document.createElement('a'); l.className='src'; l.href=a.dataset.url; l.target='_blank'; l.rel='noopener'; l.textContent='פתח בספריא'; l.dataset.external='1'; f.append(sp,l);
    var card=null;
    if(isGem){
      var tog=document.createElement('button'); tog.type='button'; tog.className='st-tog'; tog.textContent='שטיינזלץ'; tog.setAttribute('aria-pressed','false');
      var row=document.createElement('div'); row.className='stg-tabs'; var gb=document.createElement('button'); gb.type='button'; gb.className='st-tog'; gb.textContent='גמרא'; gb.setAttribute('aria-pressed','true'); row.append(gb,tog);
      card=document.createElement('div'); card.className='stw'; card.hidden=true; card.setAttribute('aria-live','polite');
      var credit=function(){sp.textContent='ביאור שטיינזלץ · CC-BY-NC · ספריא'};
      var ready=function(){ return loadSt(key).then(function(segs){ paras.forEach(function(P){ if(P.al!==undefined) return; P.al=alignPara(segs,P.text); var ws=P.el.querySelectorAll('.w'); P.ws=ws; P.map=P.al?mapTokens(P.al,[].map.call(ws,function(w){return w.textContent})):[] }); credit(); return segs }) };
      var fail=function(){card.hidden=false; card.textContent='לא ניתן לטעון את ביאור שטיינזלץ מספריא כרגע.'};
      /* רש״י on the sugya: each Gemara paragraph followed by Rashi's comments on that segment (dibbur hamatchil bold) */
      var rtog=document.createElement('button'); rtog.type='button'; rtog.className='st-tog'; rtog.textContent='רש״י'; rtog.setAttribute('aria-pressed','false'); row.appendChild(rtog);
      /* same order everywhere: גמרא · שטיינזלץ · רש״י; ״גמרא״ = the text alone (turns the commentaries off) */
      var sync=function(){ setTimeout(function(){ gb.setAttribute('aria-pressed', tog.getAttribute('aria-pressed')!=='true'&&rtog.getAttribute('aria-pressed')!=='true'); },0); };
      tog.addEventListener('click',sync); rtog.addEventListener('click',sync);
      gb.onclick=function(){ flush(); if(tog.getAttribute('aria-pressed')==='true') tog.click(); if(rtog.getAttribute('aria-pressed')==='true') rtog.click(); sync(); };
      rtog.onclick=function(){
        var on=rtog.getAttribute('aria-pressed')!=='true'; rtog.setAttribute('aria-pressed',on);
        if(!on){ b.querySelectorAll('.rsx').forEach(function(e){e.remove()}); return }
        rtog.classList.add('busy');
        ready().then(function(){ var segs={}, jobs=[];
          paras.forEach(function(P){ if(P.al&&P.al.seg) segs[P.al.seg.a]=1; });
          Object.keys(segs).forEach(function(am){ jobs.push(loadRashi(am).then(function(l){ segs[am]=l; })); });
          return Promise.all(jobs).then(function(){
            var any=false;
            paras.forEach(function(P){ var sg=P.al&&P.al.seg; if(!sg) return; var cm=((segs[sg.a]||[])[sg.i]||[]).filter(Boolean); if(!cm.length) return;
              var dv=document.createElement('div'); dv.className='rsx';
              cm.forEach(function(c){ var m=String(c).match(/^\s*(?:<b>([\s\S]*?)<\/b>)?([\s\S]*)$/), q=document.createElement('p');
                var dh=m&&m[1]?m[1]:String(c).split(/\s[-–—]\s/)[0], rest=m&&m[1]?m[2]:String(c).slice(dh.length);
                var bb=document.createElement('b'); bb.textContent=dh.replace(/<[^>]+>/g,'').trim(); q.appendChild(bb); q.appendChild(document.createTextNode(' '+rest.replace(/<[^>]+>/g,'').replace(/^\s*[-–—]\s*/,'— ').trim())); dv.appendChild(q); });
              var after=P.el; while(after.nextElementSibling&&after.nextElementSibling.classList.contains('stx')) after=after.nextElementSibling;
              after.after(dv); any=true; });
            sp.textContent='רש״י · ספריא'; rtog.classList.remove('busy'); flush();
            if(!any){ card.hidden=false; card.textContent='לא נמצאו דברי רש״י לקטע זה.'; }
          });
        }).catch(function(){ flush(); rtog.classList.remove('busy'); rtog.setAttribute('aria-pressed','false'); sync(); card.hidden=false; card.textContent='לא ניתן לטעון את רש״י מספריא כרגע.'; });
      };
      tog.onclick=function(){
        var on=tog.getAttribute('aria-pressed')!=='true'; tog.setAttribute('aria-pressed',on);
        if(!on){ b.querySelectorAll('.stx').forEach(function(e){e.remove()}); return }
        tog.classList.add('busy');
        ready().then(function(){ tog.classList.remove('busy'); paras.forEach(function(P){ if(!P.al) return; var dv=document.createElement('div'); dv.className='stx';
          P.al.ch.forEach(function(c){ renderParts(dv,c) });
          P.el.after(dv) }); flush() }).catch(function(){flush(); tog.classList.remove('busy'); tog.setAttribute('aria-pressed','false'); sync(); fail()});
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
    d.append(h); if(isGem&&typeof row!=='undefined') d.append(row); d.append(b); if(card) d.append(card); d.append(f); bg.appendChild(d); document.body.appendChild(bg);
    bg.addEventListener('click',function(e){if(e.target===bg)closeSrc()}); x.focus();
    if(isGem&&a.dataset.st) tog.click();
    if(isGem&&a.dataset.rs) rtog.click();
    /* never leave the Gemara behind a loader: show it if the commentary is slow or nothing asked for it */
    if(stFirst) setTimeout(flush, 4000);
    return true;
  }
  document.addEventListener('click',function(e){
    var a=e.target.closest&&e.target.closest('button.src[data-ref]'); if(!a) return;
    e.preventDefault(); e.stopPropagation(); openSrc(a);
  },true);
  /* a verse / source link with no cached text: fetch it from Sefaria and show it in the same in-page dialog
     (instead of leaving the page for a new tab); only if Sefaria fails does the link open normally */
  document.addEventListener('click',function(e){
    var a=e.target.closest&&e.target.closest('a.src[href*="sefaria.org/"]'); if(!a||a.dataset.external||e.metaKey||e.ctrlKey||e.shiftKey) return;
    var m=a.href.match(/sefaria\.org\/([^?#]+)/); if(!m) return;
    var key=decodeURIComponent(m[1]); if(/^[A-Z][A-Za-z_ ]+\.\d+[ab]/.test(key)) return;   /* Gemara links keep their own handling */
    e.preventDefault(); e.stopPropagation();
    var go=function(){ a.dataset.ref=key; a.dataset.url=a.href; openSrc(a); };
    if(SRC[key]) return go();
    a.classList.add('busy');
    fetch('https://www.sefaria.org/api/texts/'+encodeURIComponent(key).replace(/%2C/g,',')+'?lang=he&context=0&commentary=0')
      .then(function(r){ if(!r.ok) throw r.status; return r.json(); })
      .then(function(j){ var he=j.he; if(!he||(Array.isArray(he)&&!he.length)) throw 0;
        var ps=(Array.isArray(he)?he:[he]).map(function(t){ return String(t).replace(/<[^>]+>/g,'').replace(/&nbsp;/g,' ').trim(); }).filter(Boolean);
        SRC[key]={t:j.heRef||key, p:ps}; a.classList.remove('busy'); go(); })
      .catch(function(){ a.classList.remove('busy'); window.open(a.href,'_blank','noopener'); });
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
      var DEF={tree:true,niqqud:true}; function val(k){return (k in P)?!!P[k]:!!DEF[k];}
      var ctr=art.querySelector('.controls'); if(!ctr) return;
      var OPTS=[['open','תקצירים, הקדמה, מפתח לסוגיה ועזרים פתוחים תמיד'],['tree','תצוגת עץ כברירת מחדל'],['chav','מצב חברותא כברירת מחדל'],['niqqud','ניקוד בציטוטי הגמרא (מספריא)'],['rashi','הקשה על ציטוט פותחת את רש״י (במקום שטיינזלץ)']];
      function setOpen(on){art.querySelectorAll('details.storyline,details.flowd,details.aids,details.unlock').forEach(function(d){d.open=on})}
      function setBtn(role,on){var b=art.querySelector('.controls [data-role="'+role+'"]'); if(b&&(b.getAttribute('aria-pressed')==='true')!==on) b.click();}
      function apply(k,on){ if(k==='open') setOpen(on); if(k==='tree') setBtn('tree',on); if(k==='chav') setBtn('mode',on); if(k==='niqqud'&&window.dafNiqqud&&(on||P.niqqud===false)) window.dafNiqqud(on); }
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
      gb.addEventListener('click',function(){if(ctr.nextElementSibling!==pn) ctr.after(pn); pn.hidden=!pn.hidden; gb.setAttribute('aria-expanded',!pn.hidden);});
      if(newGb) ctr.appendChild(gb); ctr.after(pn);
      /* reading level: תמצית (summaries + every step cut to two lines, conclusions in full) · רגיל · מורחב (the Gemara line and Steinsaltz under each step) */
      var LV=[['short','תמצית'],['norm','רגיל'],['deep','מורחב']], lvb={};
      var lv=document.createElement('div'); lv.className='lvl'; lv.setAttribute('role','radiogroup'); lv.setAttribute('aria-label','רמת פירוט');
      var lvh=document.createElement('span'); lvh.className='lvl-h'; lvh.textContent='רמת פירוט'; lv.appendChild(lvh);
      LV.forEach(function(x){ var b=document.createElement('button'); b.type='button'; b.setAttribute('role','radio'); b.dataset.lv=x[0]; b.textContent=x[1]; lvb[x[0]]=b; lv.appendChild(b);
        b.addEventListener('click',function(){ setLevel(x[0],true); }); });
      function keepLast(){ art.querySelectorAll('ol.steps').forEach(function(ol){ if(!ol.querySelector(':scope > li > .tag.c')&&ol.lastElementChild) ol.lastElementChild.classList.add('lv-keep'); }); }
      function setLevel(v,user){
        if(!lvb[v]) v='norm';
        if(user){ P.lvl=v; save(); }
        LV.forEach(function(x){ lvb[x[0]].setAttribute('aria-checked', x[0]===v?'true':'false'); });
        art.classList.toggle('lvl-short', v==='short');
        if(window.dafDeep) window.dafDeep(art, v==='deep');
        if(v==='short'){ keepLast(); setBtn('mode',false); }
        setOpen(v!=='norm' || val('open'));
      }
      pn.insertBefore(lv, hd.nextSibling);   /* רמת פירוט lives in the settings panel */
      art.addEventListener('click',function(e){ if(!art.classList.contains('lvl-short')||e.target.closest('button,a')) return;
        var li=e.target.closest('ol.steps>li'); if(li) li.classList.toggle('lv-open'); });
      setTimeout(function(){ setLevel(P.lvl||'norm',false); },0);
      setTimeout(function(){ OPTS.forEach(function(o){ if(val(o[0])) apply(o[0],true); }); },0);
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
          var b=document.createElement('button'); b.type='button'; b.className='opt'; b.dataset.j=j; b.textContent=t; btns[j]=b;
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
  /* a link to a sugya (#…-s6): jump there first, before the page's heavy setup, then re-align once the setup and
     lazy-rendered sections above it have settled */
  function jump(){ if(!location.hash) return; var t=document.getElementById(location.hash.slice(1)); if(!t) return; if(t.tagName==='DETAILS') t.open=true; t.scrollIntoView(); }
  addEventListener('hashchange',function(){ var t=document.getElementById(location.hash.slice(1)); if(t&&t.tagName==='DETAILS'&&!t.open){ t.open=true; t.scrollIntoView(); } });
  var arts=document.querySelectorAll('article.daf'); arts.forEach(function(a){a.hidden=false;}); jump();
  arts.forEach(function(a){ initDaf(a); if(window.__enrichDaf) window.__enrichDaf(a); });
  jump(); if(location.hash){ requestAnimationFrame(function(){ requestAnimationFrame(jump); }); setTimeout(jump,450); }

})();

/* reader feedback: /api/feedback (Cloudflare Pages Functions + D1) */
(function(){
  var LS='daf-fb-notes';
  var ST={'new':'התקבלה, ממתינה לבדיקה','in-progress':'בטיפול','fixed':'טופלה — הדף תוקן ✓','feature':'נרשמה כהצעה לשיפור האתר','rejected':'נבדקה — לא נמצא צורך בשינוי','needs-info':'נדרש פירוט נוסף'};
  var KN={fix:'תיקון בתוכן',missing:'חסר בדף',feature:'הצעה לשיפור',contact:'פנייה'};
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
        var pg=n.page.split('/'), heb=n.page==='site'?'':(pnames[pg[0]]||pg[0])+' '+hebNum(pg[1]);
        var cd=el('div','fb-note st-'+n.status), h=el('div','fb-note-h');
        var a=el('a',null,n.page==='site'?'צור קשר':'מסכת '+heb+(n.section_title?' · '+n.section_title:''));a.href=n.page==='site'?'/':'/'+n.page+'/'+(n.section?'#'+pg[0]+pg[1]+'-'+n.section:'');
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
        var pg=n.page.split('/'), heb=n.page==='site'?'':(names[pg[0]]||pg[0])+' '+hebNum(pg[1]);
        var c=el('div','fb-note st-'+n.status);
        var h=el('div','fb-note-h');
        var a=el('a',null,n.page==='site'?'צור קשר':'מסכת '+heb+(n.section_title?' · '+n.section_title:''));a.href=n.page==='site'?'/':'/'+n.page+'/'+(n.section?'#'+pg[0]+pg[1]+'-'+n.section:'');
        h.append(el('b',null,'#'+n.id),a,el('span',null,KN[n.kind]||''),el('span',null,n.created_at.slice(0,10)));
        c.append(h,el('p','fb-note-t',n.text),el('p','fb-note-s',ST[n.status]||n.status));
        if(n.reply)c.append(el('p','fb-note-r',n.reply));
        list.append(c);
      });
    }).catch(function(){list.innerHTML='';list.append(el('p','fb-muted','לא ניתן לטעון כרגע. נסו שוב מאוחר יותר.'))});
    return;
  }

  var art=document.querySelector('article.daf');
  /* "צור קשר" (home, about): the same dialog with page "site"; app.js may be loaded lazily by the button (window.dafContact) */
  var CONTACT=!art;
  var page=CONTACT?'site':location.pathname.replace(/^\/|\/$/g,'');
  var pre=art?art.id+'-':'';
  var cfg=null;
  function getCfg(){return cfg||(cfg=fetch('/api/feedback/config').then(function(r){return r.json()}).catch(function(){return {}}))}
  function tsRender(box,look){ return window.turnstile.render(box,{sitekey:box.dataset.sk,language:'he',size:'flexible',appearance:look,'refresh-expired':'auto',
    callback:function(t){box.dataset.tok=t},'expired-callback':function(){box.dataset.tok=''},'error-callback':function(){box.dataset.tok='';return true}}); }
  function turnstile(box){
    return getCfg().then(function(c){
      if(!c.sitekey) return null;
      return new Promise(function(res){
        /* keep a fresh token: expired tokens (long writing) refresh by themselves; submit waits for one (see waitTok) */
        function go(){box.dataset.sk=c.sitekey; res(tsRender(box,'interaction-only'))}
        if(window.turnstile) return go();
        var s=document.createElement('script');s.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';s.async=true;s.onload=go;s.onerror=function(){res(null)};document.head.appendChild(s);
      });
    });
  }
  var KINDS=CONTACT?[['contact','פנייה','שאלה, בקשה או שיתוף פעולה'],['feature','הצעה לאתר','שיפור באתר עצמו'],['fix','טעות בדף','ציינו את המסכת והדף']]
    :[['fix','תיקון','טעות, ייחוס או ציטוט'],['missing','חסר בדף','סוגיה, שלב או מקור'],['feature','הצעה לאתר','שיפור באתר עצמו']];
  function open(section,title){
    var bg=el('div','srcdlg-bg');
    var d=el('div','srcdlg fb-dlg'); d.setAttribute('role','dialog'); d.setAttribute('aria-modal','true');
    var h=el('header'); var h4=el('h4',null,CONTACT?'צור קשר':section?('הערה על: '+title):'הערה על הדף');
    var x=el('button','x','×'); x.type='button'; x.setAttribute('aria-label','סגור'); h.append(h4,x);
    var f=el('form','body fb-form');
    var fs=el('fieldset','fb-kinds'); fs.appendChild(el('legend','fb-sr','סוג ההערה'));
    var ta=el('textarea'); ta.name='text'; ta.required=true; ta.minLength=5; ta.maxLength=2000; ta.rows=8;
    var PH={fix:CONTACT?'באיזו מסכת ובאיזה דף? מה לא מדויק?':'מה לא מדויק? כתבו את התיקון, ואם אפשר — ציטוט מהגמרא או מקור.',missing:'מה חסר? איזו סוגיה, שלב או מקור כדאי להוסיף?',feature:'מה היה משפר את האתר בשבילכם?',contact:'כתבו כאן את ההודעה. אם תרצו תשובה — השאירו מייל.'};
    ta.placeholder=PH[KINDS[0][0]];
    KINDS.forEach(function(k,i){var l=el('label','fb-chip'); l.title=k[2]; var r=document.createElement('input'); r.type='radio'; r.name='kind'; r.value=k[0]; if(!i) r.checked=true;
      r.addEventListener('change',function(){ta.placeholder=PH[k[0]]}); l.append(r,el('span',null,k[1])); fs.appendChild(l);});
    var nm=el('input'); nm.name='name'; nm.maxLength=80; nm.placeholder='שם (לא חובה)';
    var em=el('input'); em.name='email'; em.type='email'; em.maxLength=160; em.placeholder=CONTACT?'מייל לתשובה (לא חובה)':'מייל לעדכון (לא חובה)'; em.setAttribute('dir','ltr');
    var nl=el('label','fb-notify'); var nc=document.createElement('input'); nc.type='checkbox'; nc.name='notify';
    nl.append(nc,document.createTextNode(' אשמח לעדכון במייל כשההערה תטופל')); if(CONTACT) nl.hidden=true;
    em.addEventListener('input',function(){nc.checked=!!em.value.trim()});
    var pl=el('label','fb-notify'); var pc=document.createElement('input'); pc.type='checkbox'; pc.name='public';
    pl.append(pc,document.createTextNode(' אפשר להציג את ההערה בדף ההערות הציבורי (בלי שם ומייל)')); if(CONTACT) pl.hidden=true;
    var hp=el('input','fb-hp'); hp.name='website'; hp.tabIndex=-1; hp.autocomplete='off'; hp.setAttribute('aria-hidden','true');
    var ts=el('div','fb-ts');
    var note=el('p','fb-muted',CONTACT?'ההודעה מגיעה ישירות אליי. המייל (לא חובה) משמש רק כדי לענות לכם. אפשר גם לכתוב ל־me@tsemach.dev':'ההערה נשלחת באופן אנונימי. המייל משמש רק לעדכון על הטיפול ונמחק אחריו.');
    var who=el('div','fb-who'); who.append(nm,em);
    var me=window.dafUser&&window.dafUser();   // signed in → default name and email from the account (editable)
    if(me){ nm.value=(me.name||'').slice(0,80); em.value=(me.email||'').slice(0,160); nc.checked=!!em.value; note.textContent='השם והמייל מולאו מהחשבון שלך — אפשר לשנות או למחוק. המייל משמש רק לעדכון על הטיפול ונמחק אחריו.' }
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
      waitTok().then(function(tok){ if(!tok&&tsId!=null) return manual(); send(kind,tok); });
    });
    /* a token that is fresh now: the one from the widget, or wait (up to 6s) for a new one after a reset */
    function waitTok(){ return new Promise(function(res){ if(tsId==null||!window.turnstile) return res('');
      var t=window.turnstile.getResponse(tsId)||ts.dataset.tok||''; if(t) return res(t);
      st.textContent='מאמת שאינך רובוט…'; var n=0, iv=setInterval(function(){ var v=window.turnstile.getResponse(tsId)||ts.dataset.tok||'';
        if(v||++n>24){ clearInterval(iv); res(v); } },250); }); }
    /* the invisible check failed or timed out: show the visible check (checkbox) and let the reader send again — the text stays */
    function manual(){ try{ window.turnstile.remove(tsId); }catch(e){} ts.dataset.tok=''; tsId=tsRender(ts,'always'); ts.classList.add('fb-ts-on');
      sb.disabled=false; st.textContent='נדרש אימות קצר: סמנו את תיבת האימות שמעל, ואז לחצו ״שליחה״ שוב.'; }
    function send(kind,tok){ var _t=tok;
      fetch('/api/feedback',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({kind:kind,text:ta.value,name:nm.value,email:em.value,notify:nc.checked,public:pc.checked,website:hp.value,turnstile:tok,page:page,section:section||'',sectionTitle:title||''})})
        .then(function(r){return r.json().catch(function(){return {ok:false}})})
        .then(function(j){
          if(j&&j.ok){
            var n={id:j.id,token:j.token,page:page,section:section||'',title:title||'',at:new Date().toISOString().slice(0,10)};
            if(j.id) remember(n);
            f.innerHTML='';
            var ok=el('p','fb-ok',(CONTACT?'תודה! ההודעה נשלחה':'תודה! ההערה נקלטה')+(j.id?' (מס׳ '+j.id+')':'')+'.');
            var more=el('p',null,CONTACT?(em.value?'אענה למייל שהשארתם.':'לא השארתם מייל, לכן לא אוכל לענות ישירות.'):'היא תיבדק מול לשון הגמרא בסבב העדכון הלילי, ואם יש צורך — הדף יתוקן.');
            f.append(ok,more);
            if(j.id&&!CONTACT){
              var tl=el('p','fb-track'); var a=el('a',null,'קישור למעקב אחר ההערה'); a.href=trackUrl(n); a.target='_blank';
              var cp=el('button','btn','העתקת הקישור'); cp.type='button';
              cp.onclick=function(){(navigator.clipboard?navigator.clipboard.writeText(trackUrl(n)):Promise.reject()).then(function(){cp.textContent='הועתק ✓'}).catch(function(){})};
              tl.append(a,document.createTextNode(' '),cp); f.append(tl);
            }
            var c=el('button','btn','סגירה'); c.type='button'; c.onclick=close; f.append(c); c.focus();
          } else {
            if(j&&j.error==='captcha'&&tsId!=null&&window.turnstile) return manual();
            sb.disabled=false; st.textContent=(ERR[j&&j.error]||'ההערה לא נשמרה. נסו שוב מאוחר יותר.')+(j&&j.codes&&j.codes.length?' (קוד: '+j.codes.join(', ')+(tok?'':' · אין אסימון')+')':(j&&j.error==='captcha'&&!tok?' (האימות לא הושלם — ייתכן שחוסם פרסומות חוסם את challenges.cloudflare.com)':''));
            if(tsId!=null&&window.turnstile){ ts.dataset.tok=''; window.turnstile.reset(tsId); }
          }
        })
        .catch(function(){ sb.disabled=false; st.textContent='אין חיבור. נסו שוב מאוחר יותר.'; });
    }
  }
  if(!CONTACT) window.dafNote=function(sid,title){open(sid,title)};
  if(CONTACT){ window.dafContact=function(){open('','')};
    document.querySelectorAll('[data-contact]').forEach(function(b){b.onclick=function(e){e.preventDefault();open('','')}});
    return; }
  var ctr=art.querySelector('.controls');
  var NOTE_ICON='<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.2 3.6c-.5.4-1.3.1-1.3-.6V16A2.5 2.5 0 0 1 4 13.5z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M8 8.5h8M8 11.5h5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
  /* page-level note: an icon next to the page meta (same look as the sugya tools), not a button in the controls row */
  var pgt=art.querySelector('header .pg-tools');
  if(pgt){var pb=el('button','fb-sec'); pb.type='button'; pb.dataset.role='fb'; pb.setAttribute('aria-label','הערה על הדף'); pb.dataset.tip='הערה על הדף'; pb.innerHTML=NOTE_ICON; pb.onclick=function(){open('','')}; pgt.appendChild(pb);}
  function secTools(sec){var t=sec.querySelector('.sec-tools'); if(t) return t; var host=sec.querySelector(':scope > .amud'); t=document.createElement('span'); t.className='sec-tools'; if(host) host.appendChild(t); else {var h=sec.querySelector('h3'); if(!h) return null; h.insertBefore(t,h.firstChild)} return t}
  var secs={};
  art.querySelectorAll('section.sugya[id]').forEach(function(sec){
    if(!sec.querySelector('ol.steps')) return;
    var sid=sec.id.slice(pre.length); var t=(sec.querySelector('h3')||{}).textContent||'';
    var l=el('button','fb-sec'); l.type='button'; l.setAttribute('aria-label','הערה על סוגיה זו'); l.dataset.tip='הערה על סוגיה זו';
    l.innerHTML='<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.2 3.6c-.5.4-1.3.1-1.3-.6V16A2.5 2.5 0 0 1 4 13.5z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M8 8.5h8M8 11.5h5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
    l.onclick=function(){open(sid,t.trim())};
    sec.querySelectorAll('.fig-fb').forEach(function(b){ b.onclick=function(){open(sid,t.trim()+' — איור')}; });
    var tl=secTools(sec); if(tl) tl.appendChild(l); else sec.appendChild(l); secs[sid]=sec;
  });
  /* deep link from partner apps (feed): ?note=1 opens the note form for the page, ?note=<section id> for a sugya */
  (function(){ var q; try{q=new URLSearchParams(location.search).get('note')}catch(e){return} if(!q) return;
    var sec=secs[q]; if(sec){ sec.scrollIntoView(); open(q,((sec.querySelector('h3')||{}).textContent||'').trim()); } else open('',''); })();
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


/* niqqud on Gemara quotes (setting): the vocalized words come straight from Sefaria's William Davidson vocalized
   Aramaic text — never generated — and replace the quote's words in place; a word that does not match letter for
   letter stays as it is. Off restores the original text. */
(function(){
  var art=document.querySelector('article.daf'); if(!art) return;
  var SEFU='https://www.sefaria.org/api/texts/', VE='William_Davidson_Edition_-_Vocalized_Aramaic', VOC={}, ORIG=[], on=false, busy=null;
  function nrm(t){ return (t||'').replace(/<[^>]+>/g,' ').replace(/[֑-ׇ]/g,'').replace(/[^א-ת\s]/g,' ').replace(/\s+/g,' ').trim(); }
  function amud(r){ return VOC[r]||(VOC[r]=fetch(SEFU+r+'?lang=he&context=0&commentary=0&vhe='+VE).then(function(x){ if(!x.ok) throw x.status; return x.json(); })
      .then(function(j){ if(!/Vocalized/.test(j.heVersionTitle||'')) return []; var out=[];
        (j.he||[]).forEach(function(t){ String(t).replace(/<[^>]+>/g,' ').split(/[\s־]+/).forEach(function(v){ var n=nrm(v); if(n&&n.indexOf(' ')<0) out.push({v:v.replace(/[^א-ת֑-ׇ]/g,''),n:n}); }); }); return out; })
      .catch(function(){ delete VOC[r]; return []; })); }
  function amudsFor(sec){
    var am=sec.querySelector(':scope > .amud'), key=am&&am.dataset.ref, tr=art.dataset.tractate, dn=+art.dataset.daf, out=[];
    var m=key&&key.match(/^(.+)\.(\d+)([ab])(?:\.\d+)?(?:-(?:(\d+)([ab])\.)?\d+)?$/);
    if(m){ var d=+m[2], a=m[3], ed=m[4]?+m[4]:d, ea=m[5]||a; for(var g=0;g<6;g++){ out.push(m[1]+'.'+d+a); if(d===ed&&a===ea) break; if(a==='a') a='b'; else { a='a'; d++; } } tr=tr||m[1]; }
    if(tr&&dn) [[dn,'a'],[dn,'b'],[dn-1,'b'],[dn+1,'a']].forEach(function(x){ var r=tr+'.'+x[0]+x[1]; if(x[0]>1&&out.indexOf(r)<0) out.push(r); });
    return out;
  }
  function find(words,qw){   /* index of the best run of the quote's words in the amud, or -1 */
    var best=-1, bk=-1;
    for(var k=0;k<words.length;k++){ if(words[k].n!==qw[0]&&words[k].n!==qw[1]) continue;
      var j=k, hit=0; for(var w=0;w<qw.length;w++){ for(var z=j;z<Math.min(words.length,j+3);z++){ if(words[z].n===qw[w]){ hit++; j=z+1; break; } } }
      if(hit>best){ best=hit; bk=k; if(hit===qw.length) break; } }
    return best>=Math.max(2,Math.ceil(qw.length*0.75))?bk:-1;
  }
  function voc(q,lists){
    var T=q.textContent, ow=[], m, re=/[א-ת]+/g; while((m=re.exec(T))) ow.push([m.index,m.index+m[0].length,m[0]]);
    var qw=ow.map(function(w){return w[2]}); if(qw.length<2) return;
    for(var a=0;a<lists.length;a++){ var words=lists[a], k=find(words,qw); if(k<0) continue;
      var vw=[], j=k; qw.forEach(function(w){ var v=null; for(var z=j;z<Math.min(words.length,j+3);z++){ if(words[z].n===w){ v=words[z].v; j=z+1; break; } } vw.push(v); });
      var tw=document.createTreeWalker(q,NodeFilter.SHOW_TEXT), pos=0, nodes=[];
      while(tw.nextNode()){ var n=tw.currentNode; nodes.push([n,pos,pos+n.nodeValue.length]); pos+=n.nodeValue.length; }
      nodes.forEach(function(nd){ var out='', last=nd[1];
        ow.forEach(function(w,i){ if(vw[i]&&w[0]>=nd[1]&&w[1]<=nd[2]){ out+=T.slice(last,w[0])+vw[i]; last=w[1]; } });
        out+=T.slice(last,nd[2]); if(out!==nd[0].nodeValue){ ORIG.push([nd[0],nd[0].nodeValue]); nd[0].nodeValue=out; } });
      return; }
  }
  function run(){
    return Promise.all([].map.call(art.querySelectorAll('section.sugya'),function(sec){
      var qs=[].filter.call(sec.querySelectorAll('.gq'),function(q){ return !q.dataset.v; }); if(!qs.length) return;
      return Promise.all(amudsFor(sec).map(amud)).then(function(lists){ if(!on) return; qs.forEach(function(q){ q.dataset.v='1'; voc(q,lists); }); });
    }));
  }
  window.dafNiqqud=function(v){
    on=!!v; art.classList.toggle('niqqud',on);
    if(on){ busy=run(); return busy; }
    while(ORIG.length){ var x=ORIG.pop(); x[0].nodeValue=x[1]; }
    art.querySelectorAll('.gq[data-v]').forEach(function(q){ delete q.dataset.v; });
  };
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
  var LEX={'רבי':'רַבִּי','רב':'רַב','רבה':'רַבָּה','חייא':'חִיָּא','כהן':'כֹּהֵן','טרפון':'טַרְפוֹן','משנה':'מִשְׁנָה','אמי':'אַמִּי','אסי':'אַסִּי',
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
  /* Gemara quotes: take the vocalized words straight from Sefaria (William Davidson, vocalized Aramaic) — the
     sugya's own amudim and their neighbours; Dicta (rabbinic) only for a quote not found there */
  var SEFU='https://www.sefaria.org/api/texts/', VOC={}, VE='William_Davidson_Edition_-_Vocalized_Aramaic';
  function nrm(t){ return (t||'').replace(/<[^>]+>/g,' ').replace(/[֑-ׇ]/g,'').replace(/[^א-ת\s]/g,' ').replace(/\s+/g,' ').trim(); }
  function vocAmud(r){ return VOC[r]||(VOC[r]=fetch(SEFU+r+'?lang=he&context=0&commentary=0&vhe='+VE).then(function(x){ if(!x.ok) throw x.status; return x.json(); })
      .then(function(j){ if(!/Vocalized/.test(j.heVersionTitle||'')) return []; var out=[];
        (j.he||[]).forEach(function(t){ String(t).replace(/<[^>]+>/g,' ').split(/[\s\u05BE]+/).forEach(function(v){ var n=nrm(v); if(n&&n.indexOf(' ')<0) out.push({v:v.replace(/[^א-ת֑-ׇ]/g,''),n:n}); }); }); return out; })
      .catch(function(){ delete VOC[r]; return []; })); }
  function amudsFor(sec){
    var am=sec.querySelector(':scope > .amud'), key=am&&am.dataset.ref, tr=art.dataset.tractate, dn=+art.dataset.daf, out=[];
    var m=key&&key.match(/^(.+)\.(\d+)([ab])(?:\.\d+)?(?:-(?:(\d+)([ab])\.)?\d+)?$/);
    if(m){ var d=+m[2], a=m[3], ed=m[4]?+m[4]:d, ea=m[5]||a; for(var g=0;g<6;g++){ out.push(m[1]+'.'+d+a); if(d===ed&&a===ea) break; if(a==='a') a='b'; else { a='a'; d++; } } tr=tr||m[1]; }
    if(tr&&dn) [[dn,'a'],[dn,'b'],[dn-1,'b'],[dn+1,'a']].forEach(function(x){ var r=tr+'.'+x[0]+x[1]; if(x[0]>1&&out.indexOf(r)<0) out.push(r); });
    return out;
  }
  function weq(a,b){ return a===b||(a.length>2&&b.length>2&&(a===b.slice(1)||b===a.slice(1))); }
  function sefQuote(words,q){   /* q: the quote text → vocalized text, or null */
    var qw=nrm(q).split(' ').filter(Boolean); if(qw.length<2||!words.length) return null;
    var best=-1, bk=0;
    for(var k=0;k<words.length;k++){ if(!weq(qw[0],words[k].n)&&!weq(qw[1],words[k].n)) continue;
      var j=k, hit=0; for(var w=0;w<qw.length;w++){ for(var z=j;z<Math.min(words.length,j+3);z++){ if(weq(qw[w],words[z].n)){ hit++; j=z+1; break; } } }
      if(hit>best){ best=hit; bk=k; if(hit===qw.length) break; } }
    if(best<Math.max(2,Math.ceil(qw.length*0.75))) return null;
    /* swap word by word, keeping the quote's own punctuation (— : ?) so the voice pauses where the text does */
    var j=bk;
    return q.replace(/[א-ת]+/g,function(w){ for(var z=j;z<Math.min(words.length,j+3);z++){ if(weq(w,words[z].n)){ j=z+1; return words[z].v; } } return w; });
  }
  function sefVoc(items){
    var sec=items[0]&&items[0].sec; if(!sec) return Promise.resolve();
    var rr=[]; items.forEach(function(it){ if(it.say) return; it.rs=it.rs||runs(it.text); it.rs.forEach(function(x){ if(x.r&&!x.l&&x.t.trim()) rr.push(x); }); });
    if(!rr.length) return Promise.resolve();
    return Promise.all(amudsFor(sec).map(vocAmud)).then(function(ls){
      rr.forEach(function(x){ for(var a=0;a<ls.length;a++){ var v=sefQuote(ls[a],x.t); if(v){ x.t=v; x.l=true; return; } } });
    });
  }
  function vocalize(items){
    return sefVoc(items).then(function(){ return vocalize2(items); });
  }
  function vocalize2(items){
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
      add(li, clean(bd), tg?A+plain(clean(tg)).replace(/\d.*$/,'').trim()+Z+'. ':'');   /* the side tag is often a Gemara phrase (אמאי יחלוקו?) → rabbinic */
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

/* מפת השיטות: draw the arrows of each .vmap over its cards (from a lower card to the card it explains / rules like / rejects) */
(function(){
  var NS='http://www.w3.org/2000/svg', KC={exp:'--accent',dis:'--no',rej:'#B4691F',hal:'--ok',sup:'--ok',pro:'--muted'};
  function col(m,c){ var v=KC[c]||'--accent'; return v.charAt(0)==='-'?getComputedStyle(m).getPropertyValue(v).trim():v; }
  function el(n,a){ var e=document.createElementNS(NS,n); for(var k in a) e.setAttribute(k,a[k]); return e; }
  function draw(m){
    var body=m.querySelector('.vm-body'), svg=m.querySelector('.vm-svg'); if(!body||!svg||!body.offsetWidth) return;
    var L; try{L=JSON.parse(m.getAttribute('data-links')||'[]')}catch(e){L=[]}
    var B=body.getBoundingClientRect(), box={}; svg.innerHTML='';
    body.querySelectorAll('.vm-node').forEach(function(n){ var r=n.getBoundingClientRect(); box[n.getAttribute('data-id')]={x:r.left-B.left,y:r.top-B.top,w:r.width,h:r.height}; });
    var defs=el('defs',{}); svg.appendChild(defs); var used={}, labels=[], bg=getComputedStyle(m).backgroundColor;
    L.forEach(function(l,i){
      var a=box[l.f]; if(!a) return; var c=col(m,l.c);
      if(!used[l.c]){ used[l.c]=1; var mk=el('marker',{id:'vm'+l.c+'-'+m.dataset.vmi,viewBox:'0 0 10 10',refX:9,refY:5,markerWidth:7,markerHeight:7,orient:'auto-start-reverse'});
        mk.appendChild(el('path',{d:'M0,0 L10,5 L0,10 z',fill:c,stroke:'none'})); defs.appendChild(mk); }
      var mid=0;
      l.t.forEach(function(t,j){
        var b=box[t]; if(!b) return;
        var x1=a.x+a.w/2, x2=b.x+b.w/2, up=b.y<a.y, same=Math.abs(b.y-a.y)<8, P;
        if(same){ var y=a.y, top=y-22; P=[x1,y,x1,top,x2,top,x2,y]; }
        else { var y1=up?a.y:a.y+a.h, y2=up?b.y+b.h:b.y, my=(y1+y2)/2; P=[x1,y1,x1,my,x2,my,x2,y2]; }
        svg.appendChild(el('path',{d:'M'+P[0]+','+P[1]+' C'+P[2]+','+P[3]+' '+P[4]+','+P[5]+' '+P[6]+','+P[7],stroke:c,'stroke-dasharray':l.c==='exp'||l.c==='pro'?'5 4':'', 'marker-end':'url(#vm'+l.c+'-'+m.dataset.vmi+')'}));
        if(j===mid){ /* label at the curve's midpoint (cubic Bézier at t=½) */
          var T=l.t.length>1?0.3:0.5, U=1-T, lx=U*U*U*P[0]+3*U*U*T*P[2]+3*U*T*T*P[4]+T*T*T*P[6], ly=U*U*U*P[1]+3*U*U*T*P[3]+3*U*T*T*P[5]+T*T*T*P[7]+4, tx=el('text',{x:lx,y:ly,'text-anchor':'middle',fill:c}); tx.textContent=l.k;
          labels.push(tx); }
      });
    });
    var placed=[];   /* nudge labels apart so none covers another or a tier heading */
    body.querySelectorAll('.vm-lbl').forEach(function(h){ var r=h.getBoundingClientRect(); placed.push({x:r.left-B.left,y:r.top-B.top,width:r.width,height:r.height}); });
    labels.forEach(function(tx){ svg.appendChild(tx); var bb=tx.getBBox(), g=0;
      while(g++<8&&placed.some(function(q){return bb.x<q.x+q.width+6&&q.x<bb.x+bb.width+6&&bb.y<q.y+q.height+2&&q.y<bb.y+bb.height+2})){ tx.setAttribute('y',+tx.getAttribute('y')+(g%2?14*g:-14*g)); bb=tx.getBBox(); }
      placed.push(bb); svg.insertBefore(el('rect',{x:bb.x-4,y:bb.y-1,width:bb.width+8,height:bb.height+2,rx:4,fill:bg,class:'lbl-bg'}),tx); });
    m.classList.add('drawn');
  }
  function all(){ document.querySelectorAll('.vmap').forEach(function(m,i){ m.dataset.vmi=i; draw(m); }); }
  document.addEventListener('toggle',function(e){ if(e.target.querySelector&&e.target.querySelector('.vmap')) setTimeout(all,30); },true);
  var rt; addEventListener('resize',function(){ clearTimeout(rt); rt=setTimeout(all,120); });
  if(document.readyState!=='loading') setTimeout(all,50); else document.addEventListener('DOMContentLoaded',function(){ setTimeout(all,50); });
})();

/* "יש מפת שיטות" hint: open the section's aids and bring the map into view */
document.addEventListener('click',function(e){
  var b=e.target.closest&&e.target.closest('[data-open-aid]'); if(!b) return;
  var sec=b.closest('section'), d=sec&&sec.querySelector('details.aids'); if(!d) return;
  d.open=true; var m=d.querySelector('.vmap')||d;
  setTimeout(function(){ m.scrollIntoView({behavior:'smooth',block:'start'}); },60);
});

/* map anchors (#…-map): open its aids panel and bring it into view; "🔗 קישור למפה" shares / copies that link */
(function(){
  function openMap(){ var h=location.hash; if(!/-map$/.test(h)) return; var m=document.getElementById(h.slice(1)); if(!m) return;
    var d=m.closest('details'); if(d) d.open=true; setTimeout(function(){ m.scrollIntoView({block:'start'}); },120); }
  addEventListener('hashchange',openMap); if(document.readyState!=='loading') setTimeout(openMap,60); else document.addEventListener('DOMContentLoaded',function(){ setTimeout(openMap,60); });
  document.addEventListener('click',function(e){ var b=e.target.closest&&e.target.closest('[data-share]'); if(!b) return;
    var url=location.origin+location.pathname+b.getAttribute('data-share'), t=document.title;
    if(navigator.share){ navigator.share({title:t+' — מפת השיטות',url:url}).catch(function(){}); return; }
    (navigator.clipboard?navigator.clipboard.writeText(url):Promise.reject()).then(function(){ b.textContent='הקישור הועתק ✓'; setTimeout(function(){ b.textContent='🔗 קישור למפה'; },2000); }).catch(function(){ prompt('קישור למפה:',url); });
  });
})();

/* share: "שתף" in the page controls + a share icon on every sugya → native share sheet, else WhatsApp */
(function(){
  var art=document.querySelector('article.daf'); if(!art||document.documentElement.classList.contains('lab')) return;
  var base=location.origin+location.pathname;
  var h1=((art.querySelector('header h1')||{}).textContent||'').trim();
  var th=((art.querySelector('header .thesis')||{}).textContent||'').trim();
  if(th.length>110) th=th.slice(0,th.lastIndexOf(' ',107))+'…';
  var ICON='<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="17.5" cy="5.5" r="2.5" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="6.5" cy="12" r="2.5" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="17.5" cy="18.5" r="2.5" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M8.7 10.8l6.6-4M8.7 13.2l6.6 4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
  function share(title,text,url){
    var msg=text+'\n'+url;
    if(navigator.share){ navigator.share({title:title,text:text,url:url}).catch(function(){}); return; }
    window.open('https://wa.me/?text='+encodeURIComponent(msg),'_blank','noopener');
  }
  var pgt=art.querySelector('header .pg-tools');
  if(pgt){
    var b=document.createElement('button'); b.className='fb-sec sh-sec'; b.type='button'; b.dataset.role='share'; b.setAttribute('aria-label','שיתוף הדף'); b.dataset.tip='שיתוף הדף'; b.innerHTML=ICON;
    pgt.insertBefore(b,pgt.firstChild);
    b.onclick=function(){ share('דף צמח · '+h1, '📖 '+h1+(th?' — '+th:'')+'\nחזרה על הדף היומי, סוגיה אחר סוגיה, עם שאלות הבנה:', base); };
  }
  art.querySelectorAll('section.sugya[id]').forEach(function(sec){
    if(!sec.querySelector('ol.steps')) return;
    var t=((sec.querySelector('h3')||{}).textContent||'').trim();
    var s=document.createElement('button'); s.className='fb-sec sh-sec'; s.type='button';
    s.setAttribute('aria-label','שיתוף סוגיה זו'); s.dataset.tip='שיתוף הסוגיה'; s.innerHTML=ICON;
    s.onclick=function(){ share('דף צמח · '+h1, '📖 '+h1+' · '+t, base+'#'+sec.id); };
    var tl=sec.querySelector('.sec-tools'); if(tl) tl.insertBefore(s,tl.firstChild); else sec.appendChild(s);
  });
})();

/* milestones of a long sugya (section.stgd, data-stages=[{at,q,a}]): a header before each stage ("שלב 2/4" + its
   question) and its answer; stages open by default and fold to question + answer. Inside a stage the tree depth is counted
   from the stage's first step and capped. Steps show in full (the one-line `short` is the תמצית level's). */
(function(){
  function init(){
    document.querySelectorAll('section.sugya.stgd').forEach(function(sec){
      if(sec.dataset.stgDone) return; sec.dataset.stgDone='1';
      var S; try{S=JSON.parse(sec.dataset.stages)}catch(e){return} if(!S||!S.length) return;
      var ol=sec.querySelector('ol.steps'); if(!ol) return;
      var lis=[].slice.call(ol.querySelectorAll(':scope>li[data-k]'));
      S.sort(function(a,b){return a.at-b.at});
      var strip=document.createElement('div'); strip.className='stg-strip';
      var heads=[];
      S.forEach(function(st,i){
        var end=i+1<S.length?S[i+1].at:lis.length, mine=lis.slice(st.at,end); if(!mine.length) return;
        var base=Math.min.apply(null,mine.map(function(li){return +(li.dataset.d||0)}));
        mine.forEach(function(li){ li.dataset.stg=i; var d=Math.min(2,Math.max(0,(+(li.dataset.d||0))-base)); li.style.setProperty('--sd',d); });
        var h=document.createElement('div'); h.className='stg-h'; h.dataset.stg=i; h.setAttribute('role','button'); h.tabIndex=0;
        h.innerHTML='<span class="stg-n">'+(i+1)+'</span><span class="stg-b"><span class="stg-c">שלב '+(i+1)+' מתוך '+S.length+'</span><span class="stg-q"></span><span class="stg-a"></span></span><span class="stg-x" aria-hidden="true"></span>';
        h.querySelector('.stg-q').textContent=st.q; h.querySelector('.stg-a').textContent='✓ '+st.a;
        ol.insertBefore(h,mine[0]);
        var f=document.createElement('div'); f.className='stg-f'; f.dataset.stg=i; f.textContent='✓ '+st.a;
        mine[mine.length-1].after(f);
        function set(open){ h.classList.toggle('open',open); h.setAttribute('aria-expanded',open); mine.forEach(function(li){li.classList.toggle('stg-hid',!open)}); f.classList.toggle('stg-hid',!open); }
        h.addEventListener('click',function(e){ e.stopPropagation(); set(!h.classList.contains('open')); });
        h.addEventListener('keydown',function(e){ if(e.key==='Enter'||e.key===' '){e.preventDefault(); h.click();} });
        set(true); heads.push({h:h,set:set});
      });
      var all=document.createElement('button'); all.type='button'; all.className='stg-chip stg-all'; all.dataset.on='1'; all.textContent='קפל את השלבים';
      all.addEventListener('click',function(){ var open=all.dataset.on!=='1'; heads.forEach(function(x){x.set(open)}); all.dataset.on=open?'1':''; all.textContent=open?'קפל את השלבים':'פתח את כל השלבים'; });
      strip.appendChild(all);
      /* the "open all stages" link sits on the same row as the בקצרה pill when there is one */
      var fd=sec.querySelector(':scope > details.flowd');
      if(fd){ var row=document.createElement('div'); row.className='stg-row'; fd.before(row); row.append(fd,all); strip.remove(); }
      else { var anchor=sec.querySelector('.cv-all')||ol; anchor.before(strip); }
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',function(){setTimeout(init,0)}); else setTimeout(init,0);
})();

/* "שאל על הסוגיה": a question icon on every sugya → a small dialog; Claude answers from that sugya's own material
   (functions/api/ask). Hidden unless the server has a key (GET /api/ask → enabled). Follow-ups keep the last turns. */
(function(){
  var art=document.querySelector('article.daf'); if(!art||document.documentElement.classList.contains('lab')) return;
  var page=location.pathname.replace(/^\/|\/$/g,''), pre=art.id+'-';
  var ICON='<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M9.6 9.3a2.5 2.5 0 1 1 3.6 2.3c-.8.4-1.2.9-1.2 1.7v.4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle cx="12" cy="16.9" r="1.05" fill="currentColor"/></svg>';
  function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}
  var ERR={burst:'רגע 🙂 — נסו שוב בעוד דקה.',cap:'הגענו למכסת השאלות היומית של האתר. נסו שוב מחר.',user_cap:'שאלתם הרבה היום 🙂 אפשר לשאול שוב מחר.',too_short:'כתבו שאלה קצת יותר מפורטת.',disabled:'השירות אינו זמין כרגע.'};
  var COUNTS={};
  function open(sid,title,stage,showPrev){
    var hist=[];
    var bg=el('div','srcdlg-bg ask-bg'), d=el('div','srcdlg ask-dlg'); d.setAttribute('role','dialog'); d.setAttribute('aria-modal','true'); d.setAttribute('aria-label','שאל על הסוגיה');
    /* header: title + which sugya / stage */
    var h=el('header'), hb=el('div','ask-hd'), h4=el('h4',null,'שאל על הסוגיה'), sub=el('div','ask-sub',title);
    hb.append(h4,sub); var x=el('button','x','×'); x.type='button'; x.setAttribute('aria-label','סגור'); h.append(hb,x);
    /* body (scrolls): earlier questions (collapsed), then this conversation */
    var body=el('div','ask-body'), log=el('div','ask-log');
    var n=COUNTS[sid]||0;
    if(n){
      var prev=el('section','ask-prev'), ph=el('button','ask-prev-h'); ph.type='button'; ph.setAttribute('aria-expanded','false');
      ph.append(el('span',null,'שאלות קודמות על הסוגיה'),el('span','ask-n',String(n)),el('span','ask-chev','⌄'));
      var pl=el('div','ask-plist'); pl.hidden=true; prev.append(ph,pl); body.appendChild(prev);
      function load(){ if(pl.dataset.done) return; pl.dataset.done='1'; pl.textContent='טוען…';
        fetch('/api/ask?page='+encodeURIComponent(page)+'&section='+encodeURIComponent(sid)).then(function(r){return r.json()}).then(function(j){
          pl.textContent=''; var items=j.items||[];
          if(!items.length){ pl.appendChild(el('p','fb-muted','אין עדיין.')); return; }
          items.forEach(function(it,i){
            var dt=el('details','ask-pi'); if(i>=5) dt.hidden=true;
            var sm=el('summary'); sm.append(el('span','ask-pq',it.q),el('span','ask-chev','⌄'));
            var a=el('div','ask-pa'); String(it.a).split(/\n{2,}/).forEach(function(p){a.appendChild(el('p',null,p))});
            dt.append(sm,a); pl.appendChild(dt); });
          if(items.length>5){ var more=el('button','ask-more','עוד '+(items.length-5)+' שאלות'); more.type='button';
            more.onclick=function(){ pl.querySelectorAll('.ask-pi[hidden]').forEach(function(e){e.hidden=false}); more.remove(); }; pl.appendChild(more); }
        }).catch(function(){ pl.textContent='לא ניתן לטעון כרגע.'; delete pl.dataset.done; }); }
      function setOpen(o){ pl.hidden=!o; ph.setAttribute('aria-expanded',o); prev.classList.toggle('open',o); if(o) load(); }
      ph.onclick=function(){ setOpen(pl.hidden); };
      if(showPrev) setOpen(true);
    }
    body.appendChild(log);
    /* composer (stays at the bottom) */
    var foot=el('div','ask-foot'), f=el('form','ask-f'), ta=el('textarea'); ta.rows=1; ta.maxLength=500; ta.required=true;
    ta.placeholder=stage!=null?'שאלה על השלב הזה…':'מה לא ברור בסוגיה?'; ta.setAttribute('aria-label','השאלה');
    var sb=el('button','ask-send'); sb.type='submit'; sb.setAttribute('aria-label','שליחה'); sb.innerHTML='<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M20 12H5M11 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    var st=el('p','ask-st'); st.setAttribute('aria-live','polite');
    var note=el('p','ask-note','תשובת AI מתוך הסוגיה שבדף — עזר ללימוד, לא מקור; להלכה — שאלו רב. השאלות מוצגות ללומדים אחרים, בלי שם.');
    f.append(ta,sb); foot.append(st,f,note);
    d.append(h,body,foot); bg.appendChild(d); document.body.appendChild(bg);
    if(!showPrev) ta.focus();
    function grow(){ ta.style.height='auto'; ta.style.height=Math.min(ta.scrollHeight,120)+'px'; }
    ta.addEventListener('input',grow);
    ta.addEventListener('keydown',function(e){ if(e.key==='Enter'&&!e.shiftKey&&matchMedia('(hover:hover)').matches){ e.preventDefault(); f.requestSubmit?f.requestSubmit():sb.click(); } });
    function close(){bg.remove();document.removeEventListener('keydown',esc)} function esc(e){if(e.key==='Escape')close()}
    x.onclick=close; bg.addEventListener('click',function(e){if(e.target===bg)close()}); document.addEventListener('keydown',esc);
    f.addEventListener('submit',function(e){ e.preventDefault(); var q=ta.value.trim(); if(q.length<3) return;
      sb.disabled=true; st.textContent='חושב…';
      var pv=body.querySelector('.ask-prev.open>.ask-prev-h'); if(pv) pv.click();   /* focus on the new conversation */
      var qa=el('div','ask-q'); qa.textContent=q; log.appendChild(qa); qa.scrollIntoView({block:'nearest'});
      ta.value=''; grow();
      fetch('/api/ask',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({page:page,section:sid,stage:stage==null?null:stage,q:q,history:hist})})
        .then(function(r){return r.json().catch(function(){return {ok:false}})})
        .then(function(j){ sb.disabled=false;
          if(j&&j.ok){ st.textContent=''; var a=el('div','ask-a'); j.a.split(/\n{2,}/).forEach(function(p){a.appendChild(el('p',null,p))}); log.appendChild(a);
            hist.push({q:q,a:j.a}); ta.placeholder='שאלת המשך…'; a.scrollIntoView({block:'nearest'}); }
          else { qa.remove(); ta.value=q; grow(); st.textContent=ERR[j&&j.error]||'לא ניתן לענות כרגע. נסו שוב מאוחר יותר.'; }
        }).catch(function(){ sb.disabled=false; qa.remove(); ta.value=q; grow(); st.textContent='אין חיבור. נסו שוב.'; });
    });
  }
  fetch('/api/ask?page='+encodeURIComponent(page)).then(function(r){return r.json()}).then(function(c){
    if(!c||!c.enabled) return; COUNTS=c.counts||{}; window.dafAskCounts=COUNTS;
    art.querySelectorAll('section.sugya[id]').forEach(function(sec){
      if(!sec.querySelector('ol.steps')) return;
      var sid=sec.id.slice(pre.length), t=((sec.querySelector('h3')||{}).textContent||'').trim();
      var b=el('button','fb-sec ask-sec'); b.type='button'; b.setAttribute('aria-label','שאל על הסוגיה'); b.dataset.tip='שאל על הסוגיה'; b.innerHTML=ICON;
      b.onclick=function(){open(sid,t)};
      var tl=sec.querySelector('.sec-tools'); if(tl) tl.insertBefore(b,tl.firstChild); else sec.appendChild(b);
    });
    window.dafAsk=function(sid,title,stage,showPrev){open(sid,title,stage,showPrev)};
    document.dispatchEvent(new CustomEvent('daf:ask-on'));
  }).catch(function(){});
})();

/* small "ask" and "note" tools on each stage header and at the end of each sugya (same dialogs as the sugya icons) */
(function(){
  var art=document.querySelector('article.daf'); if(!art||document.documentElement.classList.contains('lab')) return;
  var pre=art.id+'-';
  var Q='<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M9.6 9.3a2.5 2.5 0 1 1 3.6 2.3c-.8.4-1.2.9-1.2 1.7v.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="16.9" r="1.1" fill="currentColor"/></svg>';
  var N='<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.2 3.6c-.5.4-1.3.1-1.3-.6V16A2.5 2.5 0 0 1 4 13.5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';
  var BK='<svg viewBox="0 0 16 16" width="17" height="17" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3.2c2-.9 4-.9 6 .4v9.6c-2-1.3-4-1.3-6-.4z"/><path d="M14 3.2c-2-.9-4-.9-6 .4v9.6c2-1.3 4-1.3 6-.4z"/></svg>';
  function btn(cls,icon,label,fn){ var b=document.createElement('button'); b.type='button'; b.className=cls; b.innerHTML=icon; b.setAttribute('aria-label',label); b.title=label;
    b.addEventListener('click',function(e){e.stopPropagation(); fn();}); return b; }
  function sidOf(sec){ return sec.id.slice(pre.length); }
  function titleOf(sec){ return ((sec.querySelector('h3')||{}).textContent||'').trim(); }
  function add(withAsk){
    /* stage headers */
    art.querySelectorAll('section.stgd .stg-h').forEach(function(h){
      var sec=h.closest('section.sugya'), i=+h.dataset.stg, q=(h.querySelector('.stg-q')||{}).textContent||'';
      var box=h.querySelector('.stg-tools'); if(!box){ box=document.createElement('span'); box.className='stg-tools'; h.insertBefore(box,h.querySelector('.stg-x'));
        box.appendChild(btn('stg-t','<span>'+N+'</span>','הערה על השלב',function(){ if(window.dafNote) window.dafNote(sidOf(sec),'שלב '+(i+1)+': '+q); })); }
      if(withAsk&&!box.querySelector('.stg-ask')) box.insertBefore(btn('stg-t stg-ask',Q,'שאל על השלב',function(){ window.dafAsk(sidOf(sec),'שלב '+(i+1)+': '+q,i); }),box.firstChild);
      if(window.dafStageSt&&!box.querySelector('.stg-st')) box.insertBefore(btn('stg-t stg-st',BK,'שטיינזלץ לשלב',function(){ window.dafStageSt(sec,i,'שלב '+(i+1)+': '+q); }),box.firstChild);
    });
    /* end of each sugya */
    art.querySelectorAll('section.sugya[id]').forEach(function(sec){
      var ol=sec.querySelector('ol.steps'); if(!ol) return;
      var row=sec.querySelector(':scope > .sug-end'); if(!row){ row=document.createElement('div'); row.className='sug-end'; sec.appendChild(row);
        var nb=btn('sug-t','<span>'+N+'</span><span>הערה</span>','הערה על הסוגיה',function(){ if(window.dafNote) window.dafNote(sidOf(sec),titleOf(sec)); }); row.appendChild(nb); }
      if(withAsk&&!row.querySelector('.sug-ask')){ var ab=btn('sug-t sug-ask',Q+'<span>שאלה על הסוגיה</span>','שאל על הסוגיה',function(){ window.dafAsk(sidOf(sec),titleOf(sec)); }); row.insertBefore(ab,row.firstChild);
        var cn=(window.dafAskCounts||{})[sidOf(sec)]; if(cn){ var pb=btn('sug-t sug-prev','<span>💬</span><span>שאלות קודמות ('+cn+')</span>','שאלות קודמות על הסוגיה',function(){ window.dafAsk(sidOf(sec),titleOf(sec),null,true); }); ab.after(pb); } }
    });
  }
  function go(){ add(!!window.dafAsk); }
  setTimeout(go,120); document.addEventListener('daf:ask-on',function(){ setTimeout(go,60); });
})();

/* צורת הדף: where each sugya sits on the printed Vilna page — the page image with each sugya's lines outlined
   (data from tools/tzurat: OCR of the page aligned to the Gemara text). Tap another sugya on the page to jump to it. */
(function(){
  var dj=document.querySelector('script.tz-data'); if(!dj) return;
  var TZ; try{ TZ=JSON.parse(dj.textContent); }catch(e){ return; }
  var art=dj.closest('article.daf'); if(!art) return; var key=art.id;
  var HEB=['','א','ב','ג','ד','ה','ו','ז','ח','ט'];
  function heb(n){ var t=['','י','כ','ל','מ','נ','ס','ע','פ','צ'], h=['','ק','ר','ש','ת']; var s=(n>=100?h[Math.floor(n/100)]:'')+t[Math.floor(n%100/10)]+HEB[n%10]; return s.replace('יה','טו').replace('יו','טז'); }
  var SIDS=[].map.call(art.querySelectorAll('section.sugya[id]'),function(s){ return s.id.slice(key.length+1); });
  function el(t,c,x){ var e=document.createElement(t); if(c) e.className=c; if(x!=null) e.textContent=x; return e; }
  function open(sid,am){
    var last=document.activeElement, bg=el('div','srcdlg-bg tz-bg'), d=el('div','srcdlg tz-dlg');
    d.setAttribute('role','dialog'); d.setAttribute('aria-modal','true'); d.setAttribute('aria-label','צורת הדף');
    var h=el('header'), h4=el('h4'), tools=el('span','tz-tools'), zb=el('button','tz-z'), x=el('button','x','×');
    zb.type='button'; x.type='button'; x.setAttribute('aria-label','סגור'); tools.append(zb,x); h.append(h4,tools);
    var tabs=el('div','stg-tabs tz-tabs'); tabs.setAttribute('role','tablist');
    var view=el('div','tz-view'), pg=el('div','tz-pg'), img=el('img'); img.alt='צורת הדף'; img.decoding='async'; pg.appendChild(img); view.appendChild(pg);
    var f=el('footer'), sp=el('span'), hint=el('span','tz-hint','הקש על סוגיה אחרת בדף כדי לעבור אליה'); f.append(hint,sp);
    d.append(h,tabs,view,f); bg.appendChild(d); document.body.appendChild(bg); document.documentElement.classList.add('tz-lock');
    var zoom=true, cur=am;
    function close(){ bg.remove(); document.documentElement.classList.remove('tz-lock'); document.removeEventListener('keydown',esc); if(last&&last.focus) last.focus(); }
    function esc(e){ if(e.key==='Escape') close(); }
    x.onclick=close; bg.addEventListener('click',function(e){ if(e.target===bg) close(); }); document.addEventListener('keydown',esc);
    Object.keys(TZ).sort().forEach(function(a){ var t=el('button','st-tog',a==='a'?'עמוד א':'עמוד ב'); t.type='button'; t.dataset.am=a;
      if(TZ[a].r[sid]) t.classList.add('has'); t.onclick=function(){ show(a); }; tabs.appendChild(t); });
    function bbox(a){ var r=TZ[a].r[sid]; if(!r) return null; var x0=1e9,y0=1e9,x1=0,y1=0; r.forEach(function(q){ x0=Math.min(x0,q[0]); y0=Math.min(y0,q[1]); x1=Math.max(x1,q[0]+q[2]); y1=Math.max(y1,q[1]+q[3]); }); return [x0,y0,x1,y1]; }
    function place(){ var b=bbox(cur), z=zoom&&b?Math.min(3.4,Math.max(1,82/(b[2]-b[0]))):1;
      pg.style.width=(z*100)+'%'; zb.textContent=zoom?'כל הדף':'הגדל';
      zb.setAttribute('aria-label',zoom?'הצג את כל העמוד':'הגדל לסוגיה');
      requestAnimationFrame(function(){ if(!b){ view.scrollTop=0; return; } var W=pg.clientWidth, H=pg.clientHeight;
        view.scrollLeft=Math.max(0,(b[0]+b[2])/200*W-view.clientWidth/2); view.scrollTop=Math.max(0,b[1]/100*H-24); }); }
    zb.onclick=function(){ zoom=!zoom; place(); };
    function show(a){ cur=a; var t=TZ[a]; [].forEach.call(tabs.children,function(c){ c.setAttribute('aria-pressed',c.dataset.am===a); });
      var dn=+art.dataset.daf; h4.textContent='צורת הדף · '+heb(dn)+(a==='a'?'.':':');
      sp.textContent=t.src||''; pg.querySelectorAll('.tz-r,.tz-n').forEach(function(n){ n.remove(); });
      img.width=t.w; img.height=t.h; pg.style.aspectRatio=t.w+'/'+t.h;
      Object.keys(t.r).forEach(function(s){ var on=s===sid, n=SIDS.indexOf(s)+1;
        t.r[s].forEach(function(q,i){ var r=el(on?'div':'button','tz-r'+(on?' on':'')); r.style.cssText='left:'+q[0]+'%;top:'+q[1]+'%;width:'+q[2]+'%;height:'+q[3]+'%';
          r.dataset.c=(n-1)%5; if(!on){ r.type='button'; r.setAttribute('aria-label','עבור לסוגיה '+n); r.tabIndex=i?-1:0; r.onclick=function(){ go(s); }; }
          pg.appendChild(r);
          if(!i){ var b=el('span','tz-n'+(on?' on':''),String(n)); b.dataset.c=(n-1)%5; b.style.cssText='left:'+(q[0]+q[2])+'%;top:'+q[1]+'%'; pg.appendChild(b); } }); });
      img.onload=place; img.src='/'+t.img; if(img.complete) place(); }
    function go(s){ close(); var t=document.getElementById(key+'-'+s); if(t){ t.scrollIntoView({behavior:'smooth',block:'start'}); history.replaceState(null,'','#'+t.id); } }
    show(am); x.focus();
  }
  document.addEventListener('click',function(e){ var b=e.target.closest&&e.target.closest('.tz-btn'); if(!b||!art.contains(b)) return; open(b.dataset.tz,(b.dataset.am||'a').split(' ')[0]); });
})();
