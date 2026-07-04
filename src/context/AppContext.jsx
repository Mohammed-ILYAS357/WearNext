import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import {
  addOutfit as dbAddOutfit,
  deleteOutfit as dbDeleteOutfit,
  appDayKey,
  daysBetweenKeys,
  getAllHistory,
  getAllOutfits,
  getMeta,
  setHistoryEntry,
  setMeta,
  updateOutfit as dbUpdateOutfit,
} from '../db/db'

const AppContext = createContext(null)

const DAY_MS = 24 * 60 * 60 * 1000

export function AppProvider({ children }) {
  const [outfits, setOutfits] = useState([])
  const [history, setHistory] = useState({})
  const [meta, setMetaState] = useState(null)
  const [loading, setLoading] = useState(true)
  const [reminder, setReminder] = useState(null) // { type, message }
  const notifTimerRef = useRef(null)

  const refreshOutfits = useCallback(async () => {
    const all = await getAllOutfits()
    setOutfits(all)
    return all
  }, [])

  const refreshHistory = useCallback(async () => {
    const all = await getAllHistory()
    const map = {}
    all.forEach((h) => { map[h.date] = h })
    setHistory(map)
    return map
  }, [])

  // ---- Core rollover: figure out which outfit is "today's" (app-day, 6 AM
  // boundary), advancing the queue whenever a new app-day has begun. ----
  const rollForward = useCallback(async (allOutfits, currentMeta) => {
    let m = { ...currentMeta }
    const today = appDayKey()

    if (m.todayDate !== today) {
      // A new app-day has started (crossed 6 AM since we last checked).
      if (m.todayDate && m.todayOutfitId) {
        // Yesterday's pick was never manually sent to laundry — log it to
        // history and auto-advance it into the wash so the rotation keeps
        // moving and tomorrow isn't stuck repeating it.
        await setHistoryEntry(m.todayDate, { outfitId: m.todayOutfitId, wornAt: Date.now() })
        const worn = allOutfits.find((o) => o.id === m.todayOutfitId)
        if (worn) {
          const due = Date.now() + (m.laundryDays ?? 2) * DAY_MS
          await dbUpdateOutfit(worn.id, {
            wearCount: (worn.wearCount || 0) + 1,
            lastWornAt: Date.now(),
            status: 'laundry',
            laundryEnteredAt: Date.now(),
            laundryDueAt: due,
          })
          allOutfits = allOutfits.map((o) => (o.id === worn.id ? { ...o, status: 'laundry' } : o))
        }
        m.rotationQueue = m.rotationQueue.filter((id) => id !== m.todayOutfitId)
      }

      const queueSet = new Set(m.rotationQueue)
      const available = allOutfits.filter((o) => o.status === 'queue' && queueSet.has(o.id))
      available.sort((a, b) => m.rotationQueue.indexOf(a.id) - m.rotationQueue.indexOf(b.id))

      m.todayOutfitId = available[0]?.id || null
      m.todayDate = today
      m.pendingReveal = false
      if (m.todayOutfitId) {
        m.rotationQueue = m.rotationQueue.filter((id) => id !== m.todayOutfitId)
      }
    }

    await setMeta(m)
    return m
  }, [])

  const bootstrap = useCallback(async () => {
    setLoading(true)
    const [allOutfits, m0] = await Promise.all([getAllOutfits(), getMeta()])
    const m = await rollForward(allOutfits, m0)
    setMetaState(m)
    await refreshOutfits()
    await refreshHistory()
    setLoading(false)
  }, [rollForward, refreshOutfits, refreshHistory])

  useEffect(() => { bootstrap() }, [bootstrap])

  // Re-check rollover whenever the tab regains focus/visibility, so an app
  // left open overnight updates the moment the user returns — no reload needed.
  useEffect(() => {
    const onVisible = async () => {
      if (document.visibilityState !== 'visible') return
      const [allOutfits, m0] = await Promise.all([getAllOutfits(), getMeta()])
      const m = await rollForward(allOutfits, m0)
      setMetaState(m)
      await refreshOutfits()
      await refreshHistory()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [rollForward, refreshOutfits, refreshHistory])

  // ---- Laundry reminder: gentle, persistent, never alarming ----
  useEffect(() => {
    if (!meta || loading) return
    const laundryItems = outfits.filter((o) => o.status === 'laundry')
    const overdue = laundryItems.filter((o) => o.laundryDueAt && Date.now() >= o.laundryDueAt)

    if (overdue.length > 0) {
      setReminder({
        type: 'overdue',
        message: overdue.length === 1
          ? `${overdue[0].name} has been soaking for a while — mark it done when it's ready.`
          : `${overdue.length} outfits are ready to be marked done in Laundry.`,
      })
    } else if (laundryItems.length > 0) {
      setReminder({
        type: 'in-progress',
        message: laundryItems.length === 1
          ? `${laundryItems[0].name} is in the wash.`
          : `${laundryItems.length} outfits are currently in the wash.`,
      })
    } else {
      setReminder(null)
    }
  }, [outfits, meta, loading])

  // ---- 7:30 AM "Dress of the Day" notification ----
  const scheduleNextNotification = useCallback((m) => {
    if (notifTimerRef.current) clearTimeout(notifTimerRef.current)
    if (!m?.notificationsEnabled) return
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return

    const [hh, mm] = (m.notificationTime || '07:30').split(':').map(Number)
    const now = new Date()
    const target = new Date()
    target.setHours(hh, mm, 0, 0)
    if (target <= now) target.setTime(target.getTime() + DAY_MS)
    const delay = target.getTime() - now.getTime()

    notifTimerRef.current = setTimeout(async () => {
      try {
        const reg = await navigator.serviceWorker?.getRegistration()
        const body = "Today's outfit is ready. Open WearNext to see it."
        if (reg) {
          reg.showNotification('WearNext — Dress of the Day', {
            body,
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-192.png',
            tag: 'dress-of-the-day',
          })
        } else {
          new Notification('WearNext — Dress of the Day', { body, icon: '/icons/icon-192.png' })
        }
      } catch (e) { /* notification best-effort */ }
      const latest = await getMeta()
      scheduleNextNotification(latest)
    }, delay)
  }, [])

  useEffect(() => {
    if (meta) scheduleNextNotification(meta)
    return () => { if (notifTimerRef.current) clearTimeout(notifTimerRef.current) }
  }, [meta?.notificationsEnabled, meta?.notificationTime, scheduleNextNotification])

  const enableNotifications = useCallback(async () => {
    if (typeof Notification === 'undefined') return false
    const perm = await Notification.requestPermission()
    const m = await getMeta()
    const updated = { ...m, notificationsEnabled: perm === 'granted' }
    await setMeta(updated)
    setMetaState(updated)
    return perm === 'granted'
  }, [])

  const disableNotifications = useCallback(async () => {
    const m = await getMeta()
    const updated = { ...m, notificationsEnabled: false }
    await setMeta(updated)
    setMetaState(updated)
  }, [])

  const setNotificationTime = useCallback(async (time) => {
    const m = await getMeta()
    const updated = { ...m, notificationTime: time }
    await setMeta(updated)
    setMetaState(updated)
  }, [])

  // ---- Mutations exposed to pages ----

  const createOutfit = useCallback(async (data) => {
    const preExistingAvailable = outfits.some((o) => o.status === 'queue')
    const record = await dbAddOutfit(data)
    await refreshOutfits()
    const m = await getMeta()
    const today = appDayKey()
    // Reveal immediately only if there was truly nothing else available
    // before this addition (first outfit ever, or everything else was in
    // laundry) — not if the user is just mid-day waiting out the 6 AM gate
    // with other fresh outfits already queued.
    if (!m.todayOutfitId && !preExistingAvailable) {
      const updated = {
        ...m,
        todayOutfitId: record.id,
        todayDate: today,
        pendingReveal: false,
        rotationQueue: m.rotationQueue.filter((id) => id !== record.id),
      }
      await setMeta(updated)
      setMetaState(updated)
    } else {
      setMetaState(m)
    }
    return record
  }, [refreshOutfits, outfits])

  const removeOutfit = useCallback(async (id) => {
    await dbDeleteOutfit(id)
    await refreshOutfits()
    const m = await getMeta()
    setMetaState(m)
  }, [refreshOutfits])

  const sendToLaundry = useCallback(async (id) => {
    const m = await getMeta()
    const now = Date.now()
    const due = now + (m.laundryDays ?? 2) * DAY_MS
    const wasToday = m.todayOutfitId === id
    const current = outfits.find((o) => o.id === id)

    await dbUpdateOutfit(id, {
      status: 'laundry',
      laundryEnteredAt: now,
      laundryDueAt: due,
      // Only count it as "worn" when it was actually today's pick — this is
      // the main wear-tracking path now (the auto-advance-on-rollover path
      // in rollForward covers the case where the user forgets to do this).
      ...(wasToday ? { wearCount: (current?.wearCount || 0) + 1, lastWornAt: now } : {}),
    })

    let updatedMeta = m
    if (wasToday) {
      // Log it as worn, then clear today's slot WITHOUT pulling in the next
      // outfit — the next pick only appears at the next 6 AM boundary.
      const today = appDayKey()
      if (!history[today]) {
        await setHistoryEntry(today, { outfitId: id, wornAt: now })
      }
      updatedMeta = {
        ...m,
        rotationQueue: m.rotationQueue.filter((qid) => qid !== id),
        todayOutfitId: null,
        todayDate: today,
        pendingReveal: true,
      }
      await setMeta(updatedMeta)
    } else {
      updatedMeta = { ...m, rotationQueue: m.rotationQueue.filter((qid) => qid !== id) }
      await setMeta(updatedMeta)
    }

    setMetaState(updatedMeta)
    await refreshOutfits()
    await refreshHistory()
  }, [refreshHistory, history, outfits])

  const markLaundryDone = useCallback(async (id) => {
    await dbUpdateOutfit(id, { status: 'queue', laundryEnteredAt: null, laundryDueAt: null })
    let m = await getMeta()
    m = { ...m, rotationQueue: [...m.rotationQueue.filter((qid) => qid !== id), id] }

    const today = appDayKey()
    // Sync fix: reveal this freshly-cleaned outfit immediately if — and only
    // if — nothing else was actually available (a true "everything was in
    // the wash" recovery). We check real outfit state rather than the
    // pendingReveal flag, because pendingReveal can still be true from an
    // earlier, unrelated manual send-to-laundry earlier today; that earlier
    // intentional 6 AM gate shouldn't block this distinct recovery case.
    const otherAvailable = outfits.some((o) => o.status === 'queue' && o.id !== id)
    if (!m.todayOutfitId && !otherAvailable && m.todayDate === today) {
      m.todayOutfitId = id
      m.rotationQueue = m.rotationQueue.filter((qid) => qid !== id)
      m.pendingReveal = false
    }

    await setMeta(m)
    setMetaState(m)
    await refreshOutfits()
  }, [outfits])

  const setLaundryDays = useCallback(async (days) => {
    const m = await getMeta()
    const updated = { ...m, laundryDays: days }
    await setMeta(updated)
    setMetaState(updated)
  }, [])

  const editOutfit = useCallback(async (id, patch) => {
    await dbUpdateOutfit(id, patch)
    await refreshOutfits()
  }, [refreshOutfits])

  // ---- Future scheduling (Calendar) ----
  // date offset 0 = today's app-day, 1 = tomorrow, etc. Offset i>0 maps to
  // rotationQueue[i-1] — this is what lets the Calendar show and let you
  // rearrange upcoming picks purely by reordering the queue.
  const outfitById = useCallback((id) => outfits.find((o) => o.id === id) || null, [outfits])

  const getScheduledOutfitForDate = useCallback((dateKey) => {
    if (!meta) return null
    const today = meta.todayDate || appDayKey()
    const offset = daysBetweenKeys(today, dateKey)
    if (offset < 0) return null // past dates come from history, not schedule
    if (offset === 0) return outfitById(meta.todayOutfitId)
    const queueIndex = offset - 1
    const id = meta.rotationQueue[queueIndex]
    return outfitById(id) || null
  }, [meta, outfitById])

  const swapScheduledDates = useCallback(async (dateKeyA, dateKeyB) => {
    const m = await getMeta()
    const today = m.todayDate || appDayKey()
    const offsetA = daysBetweenKeys(today, dateKeyA)
    const offsetB = daysBetweenKeys(today, dateKeyB)
    // Only future dates (offset >= 1) are swappable; today's reveal is fixed.
    if (offsetA < 1 || offsetB < 1) return
    const queue = [...m.rotationQueue]
    const iA = offsetA - 1
    const iB = offsetB - 1
    if (iA >= queue.length || iB >= queue.length) return
    ;[queue[iA], queue[iB]] = [queue[iB], queue[iA]]
    const updated = { ...m, rotationQueue: queue }
    await setMeta(updated)
    setMetaState(updated)
  }, [])

  const todayOutfit = outfits.find((o) => o.id === meta?.todayOutfitId) || null
  const laundryOutfits = outfits.filter((o) => o.status === 'laundry')
  const queueOutfits = outfits
    .filter((o) => o.status === 'queue')
    .sort((a, b) => {
      const qa = meta?.rotationQueue?.indexOf(a.id) ?? 0
      const qb = meta?.rotationQueue?.indexOf(b.id) ?? 0
      return qa - qb
    })
  // "Fresh" = ready to wear, excluding whichever one is already today's pick.
  const freshOutfits = queueOutfits.filter((o) => o.id !== meta?.todayOutfitId)

  const value = {
    loading,
    outfits,
    history,
    meta,
    reminder,
    dismissReminder: () => setReminder(null),
    todayOutfit,
    laundryOutfits,
    queueOutfits,
    freshOutfits,
    createOutfit,
    removeOutfit,
    editOutfit,
    sendToLaundry,
    markLaundryDone,
    setLaundryDays,
    enableNotifications,
    disableNotifications,
    setNotificationTime,
    getScheduledOutfitForDate,
    swapScheduledDates,
    refreshAll: async () => { await refreshOutfits(); await refreshHistory() },
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
