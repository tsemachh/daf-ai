/* offline: service worker (saved pages + Sefaria texts) and a small "no connection" note */
(function(){
  if(!('serviceWorker' in navigator)||location.protocol!=='https:'&&location.hostname!=='localhost') return;
  var SEF='https://www.sefaria.org/';
  function sefUrls(tr,d){ var out=[]; ['a','b'].forEach(function(a){ var r=tr+'.'+d+a;
    out.push(SEF+'api/texts/'+r+'?lang=he&context=0&commentary=0', SEF+'api/texts/Steinsaltz_on_'+r+'?lang=he&context=0&pad=0', SEF+'api/texts/Rashi_on_'+r+'?lang=he&context=0&pad=0'); }); return out; }
  navigator.serviceWorker.register('/sw.js').then(function(){ return navigator.serviceWorker.ready; }).then(function(reg){
    if(!navigator.onLine||!reg.active) return;
    var C={pages:[]}; try{C=JSON.parse(document.getElementById('catalog').textContent)}catch(e){}
    var cn=navigator.connection, save=cn&&(cn.saveData||/2g/.test(cn.effectiveType||''));
    /* the latest dapim (today and the next days, as prepared), so they open on the train */
    var hz=new Date(Date.now()+7*864e5).toISOString().slice(0,10);
    var latest=(C.pages||[]).filter(function(p){return p.y&&p.y<=hz}).sort(function(a,b){return (b.y||'').localeCompare(a.y||'')}).slice(0,save?2:7);
    var msg={type:'warm', pages:latest.map(function(p){return '/'+p.k+'/'}), sefaria:[]};
    var art=document.querySelector('article.daf');
    if(art&&art.dataset.tractate) msg.sefaria=sefUrls(art.dataset.tractate,art.dataset.daf);            /* the daf being read */
    if(!save){ var trs={}; document.querySelectorAll('article.daf').forEach(function(a){trs[a.dataset.tractate]=1});
      latest.slice(0,2).forEach(function(p){ var t=p.tr||(C.mas&&C.mas[p.s]&&C.mas[p.s].tr); if(t) msg.sefaria=msg.sefaria.concat(sefUrls(t,p.d)); }); }
    setTimeout(function(){ reg.active.postMessage(msg); }, 3000);   /* after the page itself has loaded */
  }).catch(function(){});
  function note(){
    var n=document.getElementById('offline-note');
    if(navigator.onLine){ if(n) n.remove(); return; }
    if(n) return; n=document.createElement('div'); n.id='offline-note'; n.setAttribute('role','status');
    n.textContent='אין חיבור — מוצגת הגרסה השמורה של הדף. ההתקדמות נשמרת ותסונכרן כשהחיבור יחזור.';
    document.body.appendChild(n);
  }
  window.addEventListener('online',note); window.addEventListener('offline',note); note();
})();
