// Firebase compat SDK checks window.firebase even in worker context.
// Expose the worker global as window so the SDK can initialize safely.
self.window = self;

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
  const title = payload.notification?.title || payload.data?.title || 'DOS';
  const body = payload.notification?.body || payload.data?.body || '';
  const tag = payload.data?.orderId || payload.data?.type || 'dos';

  self.registration.showNotification(title, {
    body,
    tag,
    icon: '/passenger/icons/Icon-192.png',
    badge: '/passenger/icons/Icon-192.png',
    data: payload.data || {},
    requireInteraction: payload.data?.type === 'executor_incoming_order',
  });
});
