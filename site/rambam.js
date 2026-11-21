/* Rambam pages: reading modes — לימוד (text + explanation) · בדיקה עצמית (tap a clause to see its explanation) · רק הרמב״ם */
(function(){
  var art=document.querySelector('article.rmb'); if(!art) return;
  var K='rmbMode', bs=[].slice.call(art.querySelectorAll('[data-rm]'));
  function set(m){ art.classList.remove('rm-test','rm-text'); if(m!=='learn') art.classList.add('rm-'+m);
    bs.forEach(function(b){ b.setAttribute('aria-pressed', b.dataset.rm===m); });
    try{ localStorage.setItem(K,m); }catch(e){} }
  bs.forEach(function(b){ b.addEventListener('click',function(){ set(b.dataset.rm); }); });
  var m='learn'; try{ m=localStorage.getItem(K)||'learn'; }catch(e){} if(m==='text'||m==='test'||m==='learn') set(m);
  art.addEventListener('click',function(e){ if(!art.classList.contains('rm-test')) return;
    var t=e.target.closest('.r-t'); if(!t) return; t.parentNode.classList.toggle('open'); });
})();
