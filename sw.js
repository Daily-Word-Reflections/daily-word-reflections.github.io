/* Daily Word service worker.
   Online: always fetches fresh from the network and keeps a copy.
   Offline or very slow network: serves the last copy kept on this phone. */
var CACHE="dw-v2";
var CORE=["./","index.html","manifest.webmanifest","icon-192.png","icon-512.png","apple-touch-icon.png","favicon.ico"];
self.addEventListener("install",function(e){e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(CORE)}).catch(function(){}));self.skipWaiting()});
self.addEventListener("activate",function(e){e.waitUntil(caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return k!==CACHE}).map(function(k){return caches.delete(k)}))}).then(function(){return self.clients.claim()}))});
function keep(req,res){if(res&&res.ok&&res.type==="basic"){var cp=res.clone();caches.open(CACHE).then(function(c){c.put(req,cp)})}return res}
self.addEventListener("fetch",function(e){
  var req=e.request;if(req.method!=="GET")return;
  var u=new URL(req.url);if(u.origin!==location.origin)return;
  var nav=req.mode==="navigate";
  e.respondWith(caches.open(CACHE).then(function(c){
    return c.match(req,{ignoreSearch:nav}).then(function(hit){
      var net=fetch(req).then(function(r){return keep(req,r)});
      if(!hit)return net.catch(function(){return nav?c.match("index.html"):Response.error()});
      /* network first, but fall back to the kept copy after 4 s or when offline */
      return new Promise(function(ok){var done=0;var t=setTimeout(function(){if(!done){done=1;ok(hit)}},4000);
        net.then(function(r){if(!done){done=1;clearTimeout(t);ok(r&&r.ok?r:hit)}}).catch(function(){if(!done){done=1;clearTimeout(t);ok(hit)}})})
    })
  }))
});
