/* Daily Word service worker: lets phones install the site as an app. Always fetches fresh from the network. */
self.addEventListener("install",function(){self.skipWaiting()});
self.addEventListener("activate",function(e){e.waitUntil(self.clients.claim())});
self.addEventListener("fetch",function(e){e.respondWith(fetch(e.request))});
