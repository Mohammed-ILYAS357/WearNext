// api/cron/notify.js
// Vercel Cron Job endpoint — triggered automatically at 07:00 and 22:00 UTC.
// Reads the stored Web Push subscription from KV and sends a push notification.
//
// Because the app keeps all outfit data in the browser's IndexedDB we can only
// send generic pushes from the server. The Service Worker then reads IDB on the
// device and shows the right personalised notification text.
//
// Required environment variables:
//   VAPID_PUBLIC_KEY   — base64url public key
//   VAPID_PRIVATE_KEY  — base64url private key  (KEEP SECRET — server only)
//   VAPID_SUBJECT      — mailto:your@email.com
//   KV_REST_API_URL    — Vercel KV REST endpoint
//   KV_REST_API_TOKEN  — Vercel KV token

export const config = { runtime: 'nodejs20.x' }

import webpush from 'web-push'

export default async function handler(req, res) {
  // Vercel Cron Jobs authenticate with a header — reject other callers.
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && req.headers['authorization'] !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const KV_URL   = process.env.KV_REST_API_URL
  const KV_TOKEN = process.env.KV_REST_API_TOKEN
  const VAPID_PUBLIC  = process.env.VAPID_PUBLIC_KEY
  const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY
  const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:mohammedilyas3579@gmail.com'

  if (!KV_URL || !KV_TOKEN || !VAPID_PUBLIC || !VAPID_PRIVATE) {
    return res.status(500).json({ error: 'Missing environment variables' })
  }

  // Read the stored subscription from Vercel KV.
  let subscription
  try {
    const kvRes = await fetch(`${KV_URL}/get/wearnext_push_subscription`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` },
    })
    const kvData = await kvRes.json()
    subscription = kvData?.result ? JSON.parse(kvData.result) : null
  } catch (e) {
    return res.status(500).json({ error: 'KV read failed', detail: String(e) })
  }

  if (!subscription) {
    return res.status(200).json({ ok: true, skipped: 'No subscription stored' })
  }

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)

  // Determine which notification to send based on the current UTC hour.
  // Cron fires at 07:00 UTC (morning) and 22:00 UTC (evening).
  // The SW overrides the body text using local IDB data, so these are fallbacks.
  const hour = new Date().getUTCHours()
  const isMorning = hour >= 6 && hour < 12
  const payload = JSON.stringify(
    isMorning
      ? {
          type: 'morning',
          title: 'WearNext — Good morning! 👗',
          body: 'Your Dress of the Day is ready.',
          url: '/#/',
          tag: 'dress-of-the-day',
        }
      : {
          type: 'evening',
          title: 'WearNext — Laundry time 🌙',
          body: "Don't forget to put today's outfit in the laundry.",
          url: '/#/laundry',
          tag: 'laundry-reminder',
        }
  )

  try {
    await webpush.sendNotification(subscription, payload, {
      TTL: 3600, // 1 hour — if device is offline, retry for up to 1 hour
    })
    return res.status(200).json({ ok: true, sent: isMorning ? 'morning' : 'evening' })
  } catch (e) {
    // 404/410 means the subscription is no longer valid — clean it up.
    if (e.statusCode === 404 || e.statusCode === 410) {
      await fetch(`${KV_URL}/del/wearnext_push_subscription`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${KV_TOKEN}` },
      })
      return res.status(200).json({ ok: true, skipped: 'Subscription expired, removed' })
    }
    return res.status(500).json({ error: 'Push failed', detail: String(e) })
  }
}
