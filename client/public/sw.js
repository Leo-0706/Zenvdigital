// ========================================================
// ZENV DIGITAL - ENTERPRISE SERVICE WORKER & PUSH ENGINE
// Handles notification bar alerts on phones & desktop even when app is closed
// ========================================================

const CACHE_NAME = 'zenv-studio-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

/**
 * Handle incoming Web Push from server (dispatches to phone notification bar)
 */
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = {
        title: 'Zenv Digital Alert',
        body: event.data.text()
      };
    }
  }

  const title = data.title || 'Zenv Digital Notification';
  const options = {
    body: data.body || 'You have an important update from Zenv Digital studio.',
    icon: data.icon || '/app_icon.png',
    badge: data.badge || '/favicon-32.png',
    vibrate: data.vibrate || [200, 100, 200, 100, 200],
    tag: data.tag || `zenv-notif-${Date.now()}`,
    renotify: true,
    requireInteraction: true,
    silent: false,
    data: data.data || { url: '/' },
    actions: [
      { action: 'open', title: 'View Update' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

/**
 * Handle click on notification in phone notification bar
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a window is already open, focus it
      for (const client of windowClients) {
        if ('focus' in client) {
          if (client.url.includes(targetUrl)) {
            return client.focus();
          }
          // Navigate existing window to target tab
          if ('navigate' in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
      }
      // If no window open, open new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

/**
 * Direct message bridge from frontend tabs
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    self.registration.showNotification(title || 'Zenv Digital', {
      icon: '/icon.svg',
      badge: '/badge.svg',
      vibrate: [200, 100, 200],
      requireInteraction: true,
      ...options
    });
  }
});
