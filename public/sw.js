// Service Worker для Web Push.
// Минимальный — только показывает уведомление и обрабатывает клик.
// Никаких offline-кешей: приложение online-only.

self.addEventListener('install', (event) => {
  // Активируем сразу, без ожидания закрытия старых вкладок
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Берём контроль над уже открытыми вкладками
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = { title: 'Armora', body: '', url: '/orders', tag: undefined };
  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch (e) {
    // payload не JSON — оставляем дефолт
  }

  const options = {
    body: data.body,
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag: data.tag,
    data: { url: data.url || '/orders' },
    // На Android renotify нужен вместе с tag, чтобы вибрация повторялась
    renotify: !!data.tag,
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/orders';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      // Если уже есть открытое окно с приложением — фокусируем его и переходим
      for (const client of list) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) {
            try { client.navigate(url); } catch (e) { /* старые браузеры */ }
          }
          return;
        }
      }
      // Иначе — открываем новое
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    }),
  );
});
