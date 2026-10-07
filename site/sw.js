/* service worker: read the daf offline (train, flight, Shabbat-prep).
   - pages (HTML): network first (4s), then the saved copy, then /offline/
   - site assets: cache first (versioned by the build)
   - Sefaria texts (Gemara, Steinsaltz, Rashi): saved copy first, refreshed in the background
   - our own /api/*: network only (progress sync, notes, auth) */
var V = '__ASSET_V__';
var STATIC = 'static-' + V, PAGES = 'pages-v1', SEF = 'sefaria-v1';
var PRE = ['/', '/offline/', '/app.css', '/app.js?v=' + V, '/progress.js?v=' + V, '/pwa.js?v=' + V, '/manifest.webmanifest',
  '/fonts/assistant-hebrew.woff2', '/fonts/frank-hebrew.woff2', '/favicon.svg', '/icon-192.png', '/quiz.json'];
var LIMIT = {}; LIMIT[PAGES] = 80; LIMIT[SEF] = 500;

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(STATIC).then(function (c) { return c.addAll(PRE); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k.indexOf('static-') === 0 && k !== STATIC; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function trim(name) {
  return caches.open(name).then(function (c) { return c.keys().then(function (ks) {
    var over = ks.length - (LIMIT[name] || 1e9); return Promise.all(ks.slice(0, Math.max(0, over)).map(function (k) { return c.delete(k); }));
  }); });
}
function put(name, req, res) {
  if (!res || !res.ok) return res;
  var copy = res.clone();
  caches.open(name).then(function (c) { return c.put(req, copy); }).then(function () { return trim(name); });
  return res;
}
function timeout(ms, p) { return new Promise(function (ok, no) { var t = setTimeout(function () { no('timeout'); }, ms); p.then(function (r) { clearTimeout(t); ok(r); }, function (e) { clearTimeout(t); no(e); }); }); }
function pageKey(url) { var u = new URL(url); return u.origin + u.pathname; }  /* ?r, #s3 → one saved copy per page */

self.addEventListener('fetch', function (e) {
  var req = e.request; if (req.method !== 'GET') return;
  var url = new URL(req.url);

  if (url.hostname === 'www.sefaria.org' && url.pathname.indexOf('/api/texts/') === 0) {
    e.respondWith(caches.open(SEF).then(function (c) { return c.match(req.url).then(function (hit) {
      var net = fetch(req).then(function (r) { return put(SEF, req.url, r); });
      if (hit) { e.waitUntil(net.catch(function () {})); return hit; }
      return net;
    }); }));
    return;
  }
  if (url.origin !== location.origin) return;           /* fonts are local; everything else external: browser default */
  if (url.pathname.indexOf('/api/') === 0 || url.pathname.indexOf('/admin') === 0) return;

  if (req.mode === 'navigate' || (req.headers.get('accept') || '').indexOf('text/html') >= 0) {
    var key = pageKey(req.url);
    e.respondWith(timeout(4000, fetch(req)).then(function (r) { return put(PAGES, key, r); }).catch(function () {
      return caches.match(key, { cacheName: PAGES }).then(function (hit) { return hit || caches.match(key, { cacheName: STATIC }); }).then(function (hit) {
        return hit || caches.match('/offline/', { cacheName: STATIC }).then(function (o) { return o || Response.error(); });
      });
    }));
    return;
  }
  e.respondWith(caches.match(req, { cacheName: STATIC }).then(function (hit) {
    return hit || caches.match(req, { cacheName: STATIC, ignoreSearch: true }).then(function (h2) {
      var net = fetch(req).then(function (r) { return put(STATIC, req, r); });
      return h2 ? net.catch(function () { return h2; }) : net;
    });
  }));
});

/* the page asks us to save pages and Sefaria texts ahead of time (latest dapim, the daf being read) */
self.addEventListener('message', function (e) {
  var d = e.data || {}; if (d.type !== 'warm') return;
  var jobs = (d.pages || []).map(function (p) {
    var key = pageKey(new URL(p, location.origin).href);
    return caches.match(key, { cacheName: PAGES }).then(function (hit) {
      if (hit && !d.refresh) return;
      return fetch(key).then(function (r) { return put(PAGES, key, r); });
    }).catch(function () {});
  }).concat((d.sefaria || []).map(function (u) {
    return caches.match(u, { cacheName: SEF }).then(function (hit) { if (!hit) return fetch(u, { mode: 'cors' }).then(function (r) { return put(SEF, u, r); }); }).catch(function () {});
  }));
  e.waitUntil(Promise.all(jobs));
});
