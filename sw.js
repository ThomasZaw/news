// Offline support. The page, its scripts and fonts are kept so the site opens with no signal;
// data files are fetched fresh when online and the last copy is used when offline.
var C='parabaik-v2',SHELL=['/','/site.css','/app.js','/ux.js','/boot.js','/lib/i18n.js','/lib/myanmar.js','/lib/towns.js','/lib/regions.js','/lib/ceMmDateTime.js','/fonts/hanken-grotesk.woff2','/fonts/cormorant-700.woff2','/fonts/noto-serif-myanmar-400.woff2','/icon-180.png','/404.html'];
self.addEventListener('install',function(e){e.waitUntil(caches.open(C).then(function(k){return Promise.all(SHELL.map(function(u){return k.add(u).catch(function(){})}))}).then(function(){return self.skipWaiting()}))});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return k!==C}).map(function(k){return caches.delete(k)}))}).then(function(){return self.clients.claim()}))});
function key(u){return u.pathname.replace(/index\.html$/,'')}
self.addEventListener('fetch',function(e){var r=e.request,u=new URL(r.url);if(r.method!=='GET'||u.origin!==location.origin)return;
  if(/^\/(quakes|obs|prices|health)$/.test(u.pathname))return;
  var font=/\/fonts\//.test(u.pathname);
  if(font){e.respondWith(caches.match(key(u)).then(function(m){return m||fetch(r).then(function(x){if(x.ok){var c=x.clone();caches.open(C).then(function(k){k.put(key(u),c)})}return x})}));return}
  e.respondWith(fetch(r).then(function(x){if(x.ok){var c=x.clone();caches.open(C).then(function(k){k.put(key(u),c)})}return x}).catch(function(){return caches.match(key(u)).then(function(m){return m||(r.mode==='navigate'?caches.match('/'):undefined)||Response.error()})}))});
self.addEventListener('push',function(e){var d={};try{d=e.data.json()}catch(x){}e.waitUntil(self.registration.showNotification(d.title||'Parabaik Daily',{body:d.body||'',icon:'icon-180.png',data:{url:d.url||'./'},tag:d.body}))});
self.addEventListener('notificationclick',function(e){e.notification.close();e.waitUntil(clients.openWindow(e.notification.data.url))});
