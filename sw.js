self.addEventListener('push',function(e){var d={};try{d=e.data.json()}catch(x){}e.waitUntil(self.registration.showNotification(d.title||'Parabaik Daily',{body:d.body||'',icon:'icon-180.png',data:{url:d.url||'./'},tag:d.body}))});
self.addEventListener('notificationclick',function(e){e.notification.close();e.waitUntil(clients.openWindow(e.notification.data.url))});
