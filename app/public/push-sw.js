// Daily check-in, imported into the generated service worker (vite.config.ts importScripts).
// The push from workers/push carries no content. Today's reminders come from the digest
// the app keeps in Cache Storage (src/web/push.ts shareRemindersWithWorker), so the
// notification is written on the phone and nothing about the user's cycle is sent.

const DIGEST_CACHE = 'lunara-reminders'
const DIGEST_PATH = '/__digest'
const FALLBACK = { title: 'Lunara', body: 'A gentle moment to check in with yourself.' }

const dayKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

async function todaysReminders() {
  try {
    const response = await (await caches.open(DIGEST_CACHE)).match(DIGEST_PATH)
    if (!response) return []
    const { requests } = await response.json()
    const today = dayKey(new Date())
    return (requests ?? []).filter((request) => dayKey(new Date(request.fireAt)) === today)
  } catch {
    return []
  }
}

self.addEventListener('push', (event) => {
  event.waitUntil(
    (async () => {
      const due = await todaysReminders()
      const first = due[0]
      // Browsers require a visible notification for every push, so there is always one.
      const title = !first ? FALLBACK.title : due.length > 1 ? `Lunara · ${due.length} reminders today` : first.title
      const body = !first
        ? FALLBACK.body
        : due.length > 1
          ? `${first.body} Open Lunara for the rest.`
          : first.body
      await self.registration.showNotification(title, {
        body,
        icon: '/icons/icon-192.png',
        tag: 'lunara-check-in',
        data: { url: '/' },
      })
    })(),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(event.notification.data?.url ?? '/', self.location.origin).href
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const open = windows.find((client) => new URL(client.url).origin === self.location.origin)
      if (open) return open.focus()
      return self.clients.openWindow(url)
    })(),
  )
})
