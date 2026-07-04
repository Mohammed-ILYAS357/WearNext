import { openDB } from 'idb'

const DB_NAME = 'wearnext-db'
const DB_VERSION = 1

/**
 * WearNext stores everything on-device. Nothing ever leaves the browser —
 * there is no server, no sync, no account. IndexedDB is used instead of
 * localStorage because outfit photos are stored as data URLs and can be a
 * few hundred KB each; localStorage's ~5MB ceiling would fill up after a
 * handful of outfits, whereas IndexedDB comfortably holds a full wardrobe
 * offline.
 */
export async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('outfits')) {
        db.createObjectStore('outfits', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('history')) {
        // key = 'YYYY-MM-DD'
        db.createObjectStore('history', { keyPath: 'date' })
      }
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' })
      }
    },
  })
}

export function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

// ---------- Outfits ----------

export async function addOutfit(outfit) {
  const db = await getDB()
  const record = {
    id: uid(),
    name: outfit.name,
    category: outfit.category, // 'Formal' | 'Casual'
    notes: outfit.notes || '',
    image: outfit.image || null, // data URL, or null for text-only entries
    color: outfit.color || [111, 183, 232], // fallback sky blue rgb
    hex: outfit.hex || '#6FB7E8',
    status: 'queue', // 'queue' | 'laundry'
    laundryEnteredAt: null,
    laundryDueAt: null,
    wearCount: 0,
    lastWornAt: null,
    createdAt: Date.now(),
  }
  await db.put('outfits', record)

  const meta = await getMeta()
  meta.rotationQueue.push(record.id)
  await setMeta(meta)

  return record
}

export async function updateOutfit(id, patch) {
  const db = await getDB()
  const existing = await db.get('outfits', id)
  if (!existing) return null
  const updated = { ...existing, ...patch }
  await db.put('outfits', updated)
  return updated
}

export async function deleteOutfit(id) {
  const db = await getDB()
  await db.delete('outfits', id)
  const meta = await getMeta()
  meta.rotationQueue = meta.rotationQueue.filter((qid) => qid !== id)
  if (meta.todayOutfitId === id) meta.todayOutfitId = null
  await setMeta(meta)
}

export async function getAllOutfits() {
  const db = await getDB()
  return db.getAll('outfits')
}

export async function getOutfit(id) {
  if (!id) return null
  const db = await getDB()
  return db.get('outfits', id)
}

// ---------- Meta (rotation queue + today's pick + settings) ----------

const DEFAULT_META = {
  key: 'app',
  rotationQueue: [], // array of outfit ids, front = next in line to be worn
  todayOutfitId: null,
  todayDate: null, // 'YYYY-MM-DD', the app-day (see appDayKey) this pick belongs to
  pendingReveal: false, // true = today's slot was intentionally cleared early; wait for the next 6 AM boundary
  laundryDays: 2, // default laundry duration
  notificationsEnabled: false,
  notificationTime: '07:30',
  lastReminderDismissedDate: null,
}

export async function getMeta() {
  const db = await getDB()
  const meta = await db.get('meta', 'app')
  return meta ? { ...DEFAULT_META, ...meta } : { ...DEFAULT_META }
}

export async function setMeta(meta) {
  const db = await getDB()
  await db.put('meta', { ...meta, key: 'app' })
  return meta
}

// ---------- History (calendar) ----------

export async function setHistoryEntry(dateKey, entry) {
  const db = await getDB()
  await db.put('history', { date: dateKey, ...entry })
}

export async function getHistoryEntry(dateKey) {
  const db = await getDB()
  return db.get('history', dateKey)
}

export async function getAllHistory() {
  const db = await getDB()
  return db.getAll('history')
}

export function todayKey(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const APP_DAY_START_HOUR = 6

/**
 * WearNext's "day" starts at 6:00 AM, not midnight — a dress sent to laundry
 * at 9 PM shouldn't reveal tomorrow's pick at 12:01 AM while you're still
 * awake. Anything before 6 AM still counts as the previous calendar day.
 */
export function appDayKey(d = new Date()) {
  const adjusted = new Date(d)
  if (adjusted.getHours() < APP_DAY_START_HOUR) {
    adjusted.setDate(adjusted.getDate() - 1)
  }
  return todayKey(adjusted)
}

export function addDaysToKey(dateKey, days) {
  const [y, m, d] = dateKey.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + days)
  return todayKey(date)
}

export function daysBetweenKeys(fromKey, toKey) {
  const [y1, m1, d1] = fromKey.split('-').map(Number)
  const [y2, m2, d2] = toKey.split('-').map(Number)
  const a = new Date(y1, m1 - 1, d1)
  const b = new Date(y2, m2 - 1, d2)
  return Math.round((b - a) / (24 * 60 * 60 * 1000))
}
