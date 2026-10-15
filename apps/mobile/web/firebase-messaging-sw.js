// Firebase compat SDK checks window.firebase even in worker context.
// Expose the worker global as window so the SDK can initialize safely.
self.window = self;

// Register before Firebase so offer clicks reliably reopen the passenger app.
self.addEventListener('notificationclick', (event) => {
  const data = event.notification.data?.FCM_MSG?.data || event.notification.data || {};
  if (data.type !== 'ride_price_offer') return;
  event.stopImmediatePropagation();
  event.notification.close();
  event.waitUntil((async () => {
    const url = new URL('/passenger/#/passenger/home', self.location.origin).href;
    const windows = await self.clients.matchAll({type: 'window', includeUncontrolled: true});
    const passenger = windows.find((client) => new URL(client.url).origin === self.location.origin && new URL(client.url).pathname.startsWith('/passenger/'));
    if (passenger) return passenger.focus();
    return self.clients.openWindow(url);
  })());
});

importScripts('https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyDZyOT7jDGn4trP11G8jVUX_PwAb9AqIPY',
  appId: '1:921107545537:web:ff267926dfbffcfe8f4340',
  messagingSenderId: '921107545537',
  projectId: 'dos-taxi',
  authDomain: 'dos-taxi.firebaseapp.com',
  databaseURL: 'https://dos-taxi-default-rtdb.asia-southeast1.firebasedatabase.app',
  storageBucket: 'dos-taxi.firebasestorage.app',
  measurementId: 'G-VSFRVPQS36',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  // FCM already displays notification payloads; only render data-only messages here.
  if (payload.notification) return;
  const title = payload.notification?.title || payload.data?.title || 'DOS';
  const body = payload.notification?.body || payload.data?.body || '';
  const tag = payload.data?.offerId ? `ride-offer:${payload.data.offerId}:${payload.data.version || '1'}` : payload.data?.orderId || payload.data?.type || 'dos';

  self.registration.showNotification(title, {
    body,
    tag,
    icon: '/passenger/icons/Icon-192.png',
    badge: '/passenger/icons/Icon-192.png',
    data: payload.data || {},
    requireInteraction: ['executor_incoming_order', 'ride_price_offer'].includes(payload.data?.type),
    renotify: payload.data?.type === 'ride_price_offer',
  });
});
