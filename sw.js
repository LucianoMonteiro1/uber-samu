
const CACHE_NAME = 'samu-connect-v4-final';
const RECORDINGS_CACHE = 'samu-voice-recordings';

const ASSETS_TO_CACHE = [
  './',
  'index.html',
  'manifest.json',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
});

// Listener para notificações de despacho (vêm da aba ativa ou push)
self.addEventListener('push', (event) => {
  const data = event.data?.json() || { title: 'NOVA OCORRÊNCIA', body: 'Despacho imediato!' };
  
  const options = {
    body: data.body,
    icon: 'https://cdn-icons-png.flaticon.com/512/822/822143.png',
    badge: 'https://cdn-icons-png.flaticon.com/512/822/822143.png',
    vibrate: [500, 110, 500, 110, 450, 110, 200, 110, 170, 40, 450, 110, 200, 110, 170, 40],
    data: { url: self.location.origin },
    tag: 'emergency-dispatch',
    renotify: true,
    requireInteraction: true, // Mantém na tela até o usuário agir
    actions: [
      { action: 'open', title: 'VER MAPA' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      if (clientList.length > 0) return clientList[0].focus();
      return clients.openWindow('./');
    })
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('generativelanguage.googleapis.com')) return;
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});
