const FALLBACK_NOTIFICATION = {
  title: 'Trackly',
  body: 'You have a scheduled reminder.',
  data: { type: 'unknown' },
};

function notificationFromEvent(event) {
  if (!event.data) return FALLBACK_NOTIFICATION;
  try {
    const value = event.data.json();
    if (!value || typeof value !== 'object') return FALLBACK_NOTIFICATION;
    return {
      title:
        typeof value.title === 'string' && value.title.trim()
          ? value.title
          : FALLBACK_NOTIFICATION.title,
      body:
        typeof value.body === 'string' && value.body.trim()
          ? value.body
          : FALLBACK_NOTIFICATION.body,
      data:
        value.data && typeof value.data === 'object'
          ? value.data
          : FALLBACK_NOTIFICATION.data,
    };
  } catch {
    return FALLBACK_NOTIFICATION;
  }
}

function routeForNotification(data) {
  return data?.type === 'habit_reminder' ? '/today' : '/today';
}

self.addEventListener('push', (event) => {
  const notification = notificationFromEvent(event);
  event.waitUntil(
    self.registration.showNotification(notification.title, {
      body: notification.body,
      data: notification.data,
      tag:
        notification.data?.type === 'habit_reminder' &&
        typeof notification.data.reminderId === 'string'
          ? `habit-reminder:${notification.data.reminderId}`
          : 'trackly-reminder',
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const path = routeForNotification(event.notification.data);
  const target = new URL(path, self.location.origin).href;
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(async (windows) => {
        const existing = windows.find(
          (client) => new URL(client.url).origin === self.location.origin,
        );
        if (existing) {
          if ('navigate' in existing) await existing.navigate(target);
          return existing.focus();
        }
        return self.clients.openWindow(target);
      }),
  );
});
