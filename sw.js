/* Daily Word service worker.
   The app page and its data: the newest version from the network, waiting up to 2 seconds; on a slow or no connection, the copy kept on this phone.
   Pictures and other files: the kept copy at once, refreshed quietly for next time. Offline: the kept copy. */
var CACHE="dw-v5";
var CORE=["./","index.html","manifest.webmanifest","icon-192.png","icon-512.png","apple-touch-icon.png","favicon.ico"];
self.addEventListener("install",function(e){e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(CORE)}).catch(function(){}));self.skipWaiting()});
self.addEventListener("activate",function(e){e.waitUntil(caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return k!==CACHE}).map(function(k){return caches.delete(k)}))}).then(function(){return self.clients.claim()}))});
function keep(req,res){if(res&&res.ok&&res.type==="basic"){var cp=res.clone();caches.open(CACHE).then(function(c){c.put(req,cp)})}return res}
self.addEventListener("fetch",function(e){
  var req=e.request;if(req.method!=="GET")return;
  var u=new URL(req.url);if(u.origin!==location.origin)return;
  if(/\.ics$/.test(u.pathname)||/\/version\.txt$/.test(u.pathname)||u.pathname.indexOf("/audio/")===0)return;
  var nav=req.mode==="navigate";
  /* Other pages (SOS, landing pages): always from the network, kept copy only when offline */
  var sp=new URL(self.registration.scope).pathname;
  if(nav&&u.pathname!==sp&&u.pathname!==sp+"index.html"){e.respondWith(fetch(req).then(function(r){return keep(req,r)}).catch(function(){return caches.match(req)}));return}
  /* App page and data: network first, kept copy after 2 seconds or when offline */
  if(nav||/\/data\/[^/]+\.json$/.test(u.pathname)){var key=nav?"index.html":req;
    e.respondWith(caches.open(CACHE).then(function(c){
      var net=fetch(nav?u.href:req,{cache:"no-cache",credentials:"same-origin"}).then(function(r){if(r&&r.ok&&r.type==="basic")c.put(key,r.clone());return r});
      e.waitUntil(net.catch(function(){}));
      var slow=new Promise(function(res){setTimeout(function(){c.match(key,{ignoreSearch:nav}).then(function(h){if(h)res(h)})},2000)});
      return Promise.race([net.catch(function(){return c.match(key,{ignoreSearch:nav}).then(function(h){return h||Response.error()})}),slow]);
    }));return}
  e.respondWith(caches.open(CACHE).then(function(c){
    return c.match(nav?"index.html":req,{ignoreSearch:nav}).then(function(hit){
      var net=(nav?fetch(u.href,{cache:"no-cache",credentials:"same-origin"}):fetch(req,{cache:"no-cache"})).then(function(r){if(nav&&r&&r.ok&&r.type==="basic"){var cp=r.clone();c.put("index.html",cp)}return keep(req,r)});
      if(hit){e.waitUntil(net.catch(function(){}));return hit}
      return net.catch(function(){return nav?c.match("index.html"):Response.error()});
    })
  }))
});
