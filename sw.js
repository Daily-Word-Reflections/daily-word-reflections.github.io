/* Daily Word service worker.
   Opens at once from the copy kept on this phone, then quietly fetches the newest version for next time.
   First visit, or a page not yet kept: fetched from the network. Offline: the kept copy. */
var CACHE="dw-v3";
var CORE=["./","index.html","manifest.webmanifest","icon-192.png","icon-512.png","apple-touch-icon.png","favicon.ico"];
self.addEventListener("install",function(e){e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(CORE)}).catch(function(){}));self.skipWaiting()});
self.addEventListener("activate",function(e){e.waitUntil(caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return k!==CACHE}).map(function(k){return caches.delete(k)}))}).then(function(){return self.clients.claim()}))});
function keep(req,res){if(res&&res.ok&&res.type==="basic"){var cp=res.clone();caches.open(CACHE).then(function(c){c.put(req,cp)})}return res}
self.addEventListener("fetch",function(e){
  var req=e.request;if(req.method!=="GET")return;
  var u=new URL(req.url);if(u.origin!==location.origin)return;
  if(/\.ics$/.test(u.pathname))return;
  var nav=req.mode==="navigate";
  e.respondWith(caches.open(CACHE).then(function(c){
    return c.match(nav?"index.html":req,{ignoreSearch:nav}).then(function(hit){
      var net=fetch(req).then(function(r){if(nav&&r&&r.ok&&r.type==="basic"){var cp=r.clone();c.put("index.html",cp)}return keep(req,r)});
      if(hit){e.waitUntil(net.catch(function(){}));return hit}
      return net.catch(function(){return nav?c.match("index.html"):Response.error()});
    })
  }))
});
