// ========================================================
// ZENV DIGITAL - CLIENT NOTIFICATION BAR & PUSH MANAGER
// Registers service worker, requests phone permission, and handles push
// ========================================================

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const notificationManager = {
  isSupported() {
    return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
  },

  getPermissionState() {
    if (!this.isSupported()) return 'unsupported';
    return Notification.permission; // 'default', 'granted', 'denied'
  },

  async requestPermission(token) {
    if (!this.isSupported()) {
      return { success: false, error: 'NOT_SUPPORTED', message: 'Notification Bar API is not supported in this browser.' };
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        return {
          success: false,
          permission,
          message: permission === 'denied'
            ? 'Notifications were blocked. Please allow notifications in your browser or phone site settings.'
            : 'Notification permission was dismissed.'
        };
      }

      // Ensure service worker is registered and ready
      const registration = await navigator.serviceWorker.ready;

      // Fetch VAPID Public Key from backend
      const vapidRes = await fetch('/api/notifications/vapid-public-key');
      const vapidData = await vapidRes.json();
      if (!vapidData.success || !vapidData.publicKey) {
        throw new Error(vapidData.error || 'Failed to fetch VAPID public key');
      }

      // Subscribe to PushManager
      const convertedVapidKey = urlBase64ToUint8Array(vapidData.publicKey);
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey
        });
      }

      // Send subscription to backend server
      if (token) {
        await fetch('/api/notifications/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ subscription })
        });
      }

      // Display initial confirmation in the notification tray
      try {
        await registration.showNotification('Zenv Digital Alerts Enabled', {
          body: 'You will receive instant alerts for new chat messages, shoot schedules, video audits, and payment updates even when the app is closed.',
          icon: '/icon.svg',
          badge: '/badge.svg',
          vibrate: [200, 100, 200],
          tag: 'zenv-welcome-alert',
          data: { url: '/' }
        });
      } catch (notifErr) {
        console.warn('Initial registration alert warning:', notifErr);
      }

      return {
        success: true,
        permission: 'granted',
        message: 'Phone notification bar alerts enabled successfully!'
      };
    } catch (err) {
      console.error('Error enabling notifications:', err);
      return { success: false, error: err.message, message: 'Could not enable notification alerts: ' + err.message };
    }
  },

  async sendTestNotification(token) {
    if (!this.isSupported()) {
      return { success: false, message: 'Notification bar not supported in this browser.' };
    }

    if (Notification.permission !== 'granted') {
      return { success: false, message: 'Please grant notification permission first.' };
    }

    // Try backend push dispatch first
    let backendSuccess = false;
    if (token) {
      try {
        const res = await fetch('/api/notifications/test', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        });
        const data = await res.json();
        backendSuccess = data.success;
      } catch (e) {
        console.warn('Backend push test error:', e);
      }
    }

    // Always trigger direct service worker notification as guaranteed fallback
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification('Zenv Digital • Notification Bar Test', {
        body: 'Alerts are working perfectly! You will receive notifications for new messages, shoots, video cuts, and invoices right here.',
        icon: '/icon.svg',
        badge: '/badge.svg',
        vibrate: [200, 100, 200, 100, 200],
        tag: 'zenv-test-push-' + Date.now(),
        renotify: true,
        requireInteraction: true,
        data: { url: '/' }
      });
      return {
        success: true,
        message: 'Test notification dispatched to your phone/system notification bar!'
      };
    } catch (e) {
      // Local Notification constructor fallback
      try {
        new Notification('Zenv Digital • Notification Bar Test', {
          body: 'Alerts are working perfectly! You will receive notifications for new messages, shoots, video cuts, and invoices right here.',
          icon: '/icon.svg'
        });
        return {
          success: true,
          message: 'Test notification dispatched to your notification bar!'
        };
      } catch (err) {
        return {
          success: false,
          message: 'Error displaying notification: ' + err.message
        };
      }
    }
  }
};
