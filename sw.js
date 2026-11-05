var C='parabaik-v1';
self.addEventListener('install',function(e){self.skipWaiting()});
self.addEventListener('activate',function(e){e.waitUntil(self.clients.claim())});
self.addEventListener('fetch',function(e){var r=e.request,u=new URL(r.url);if(r.method!=='GET'||u.origin!==location.origin)return;
  e.respondWith(fetch(r).then(function(x){if(x.ok){var c=x.clone();caches.open(C).then(function(k){k.put(u.pathname==='/'?'/':u.pathname,c)})}return x}).catch(function(){return caches.match(u.pathname==='/'?'/':u.pathname).then(function(m){return m||caches.match('/')})}))});
self.addEventListener('push',function(e){var d={};try{d=e.data.json()}catch(x){}e.waitUntil(self.registration.showNotification(d.title||'Parabaik Daily',{body:d.body||'',icon:'icon-180.png',data:{url:d.url||'./'},tag:d.body}))});
self.addEventListener('notificationclick',function(e){e.notification.close();e.waitUntil(clients.openWindow(e.notification.data.url))});
