// WearNext Service Worker
// Handles: offline precaching, morning "Dress of the Day" notification,
// and the 10 PM "put it in laundry" reminder — both of which fire from here
// so they work even when the browser tab is closed.

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'

// Inject the Vite/Workbox asset manifest at build time.
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// ─── Raw IndexedDB helpers (no external lib in SW) ───────────────────────────
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('wearnext-db', 1)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
    // If called before the main app has created the DB, just reject gracefully.
    req.onupgradeneeded = () => req.transaction.abort()
  })
}

function dbGet(db, store, key) {
  return new Promise((resolve) => {
    try {
      const req = db.transaction(store, 'readonly').objectStore(store).get(key)
      req.onsuccess = () => resolve(req.result ?? null)
      req.onerror = () => resolve(null)
    } catch { resolve(null) }
  })
}

function dbGetAll(db, store) {
  return new Promise((resolve) => {
    try {
      const req = db.transaction(store, 'readonly').objectStore(store).getAll()
      req.onsuccess = () => resolve(req.result ?? [])
      req.onerror = () => resolve([])
    } catch { resolve([]) }
  })
}

function dbPut(db, store, record) {
  return new Promise((resolve) => {
    try {
      const req = db.transaction(store, 'readwrite').objectStore(store).put(record)
      req.onsuccess = () => resolve()
      req.onerror = () => resolve()
    } catch { resolve() }
  })
}

function dateKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ─── Core notification check ──────────────────────────────────────────────────
// Called on every SW activation event and on every periodic-sync tick.
// We use a per-day deduplication key stored in the `meta` IDB store so
// we never fire the same notification twice in one day, even if this
// function gets called multiple times.
async function checkAndFireNotifications() {
  if ((self.Notification?.permission ?? 'default') !== 'granted') return

  let db
  try { db = await openDB() } catch { return }

  const meta = await dbGet(db, 'meta', 'app')
  if (!meta?.notificationsEnabled) return

  const now = new Date()
  const h = now.getHours()
  const min = now.getMinutes()
  const today = dateKey(now)

  // ── Morning: "Dress of the Day" ──────────────────────────────────────────
  const [mh, mm] = (meta.notificationTime || '07:30').split(':').map(Number)
  // Fire within a 10-minute window of the configured time (covers the case
  // where the SW wakes up a few minutes late).
  const minutesSinceMorning = (h * 60 + min) - (mh * 60 + mm)
  if (minutesSinceMorning >= 0 && minutesSinceMorning < 10) {
    const alreadyFired = await dbGet(db, 'meta', `_notif_morning_${today}`)
    if (!alreadyFired) {
      await self.registration.showNotification('WearNext — Good morning! 👗', {
        body: "Your Dress of the Day is ready. Tap to see it.",
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: 'dress-of-the-day',
        renotify: false,
        data: { url: '/#/' },
      })
      await dbPut(db, 'meta', { key: `_notif_morning_${today}`, fired: now.toISOString() })
    }
  }

  // ── Evening 10 PM: "Put it in the laundry" ────────────────────────────────
  // Always shown if notifications are enabled — the user asked for this
  // explicitly and it requires no extra settings toggle.
  const minutesSinceEvening = (h * 60 + min) - (22 * 60) // 22:00
  if (minutesSinceEvening >= 0 && minutesSinceEvening < 10) {
    const alreadyFired = await dbGet(db, 'meta', `_notif_evening_${today}`)
    if (!alreadyFired) {
      // Only remind if today's outfit hasn't been sent to laundry yet.
      const outfits = await dbGetAll(db, 'outfits')
      const todayOutfit = outfits.find(o => o.id === meta.todayOutfitId)
      const needsReminder = todayOutfit && todayOutfit.status !== 'laundry'

      if (needsReminder) {
        await self.registration.showNotification("WearNext — Laundry time 🌙", {
          body: `Don't forget to put "${todayOutfit.name}" in the laundry before bed.`,
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          tag: 'laundry-reminder',
          renotify: true,
          actions: [{ action: 'open-laundry', title: 'Open Laundry' }],
          data: { url: '/#/laundry' },
        })
      }
      // Mark evening slot as checked (even if no notification sent) so we
      // don't hammer IDB on repeated SW wakes within the same 10-min window.
      await dbPut(db, 'meta', { key: `_notif_evening_${today}`, fired: now.toISOString(), sent: !!needsReminder })
    }
  }
}

// ─── SW lifecycle ─────────────────────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    self.clients.claim().then(() => checkAndFireNotifications())
  )
})

// ─── Periodic Background Sync ─────────────────────────────────────────────────
// Chrome on Android (installed PWA) supports this. It wakes the SW roughly
// once per hour (the exact interval is controlled by the browser based on
// usage patterns). Combined with the main-thread setTimeout (which fires
// when the app tab is open), this gives us reliable notification delivery.
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'wearnext-notif-check') {
    event.waitUntil(checkAndFireNotifications())
  }
})

// ─── Manual trigger from main thread ─────────────────────────────────────────
// The React app posts this message on boot and when the user enables
// notifications, giving an immediate check without waiting for a fetch.
self.addEventListener('message', (event) => {
  if (event.data?.type === 'CHECK_NOTIFICATIONS') {
    event.waitUntil(checkAndFireNotifications())
  }
})

// ─── Notification click: deep-link into the right page ───────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/#/'
  const actionUrl = event.action === 'open-laundry' ? '/#/laundry' : targetUrl

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a WearNext tab is already open, navigate it instead of opening a new one.
      for (const client of clientList) {
        if ('navigate' in client) {
          client.navigate(actionUrl)
          return client.focus()
        }
      }
      return self.clients.openWindow(actionUrl)
    })
  )
})
