import { useMemo, useState } from 'react'
import { Check, Settings2, Bell, BellOff, Shirt } from 'lucide-react'
import { useApp } from '../context/AppContext'
import LaundryGlass from '../components/LaundryGlass'

function timeRemainingLabel(dueAt) {
  const diff = dueAt - Date.now()
  const days = Math.round(diff / (24 * 60 * 60 * 1000))
  if (diff <= 0) return { text: 'Ready whenever you are', urgent: false }
  if (days <= 1) return { text: 'Almost ready — about a day left', urgent: false }
  return { text: `${days} days remaining`, urgent: false }
}

export default function Laundry() {
  const { laundryOutfits, markLaundryDone, meta, setLaundryDays, enableNotifications, disableNotifications, setNotificationTime } = useApp()
  const [showSettings, setShowSettings] = useState(false)

  const fillPercent = useMemo(() => Math.min(100, (laundryOutfits.length / 6) * 100), [laundryOutfits])

  const notifSupported = typeof window !== 'undefined' && 'Notification' in window

  return (
    <div className="min-h-screen px-6 pb-28 pt-8">
      <header className="mb-2 flex items-start justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em]" style={{ color: 'var(--color-ink-soft)' }}>Wash cycle</p>
          <h1 className="font-display text-3xl" style={{ color: 'var(--color-ink)' }}>Laundry</h1>
        </div>
        <button
          onClick={() => setShowSettings((s) => !s)}
          className="rounded-full p-2.5"
          style={{ background: 'var(--color-mist)' }}
          aria-label="Laundry settings"
        >
          <Settings2 size={18} style={{ color: 'var(--color-blue)' }} />
        </button>
      </header>

      <div className="my-6 flex flex-col items-center gap-3 rounded-3xl py-8" style={{ background: 'var(--color-mist)' }}>
        <LaundryGlass percent={fillPercent} size={120} />
        <p className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
          {laundryOutfits.length === 0
            ? 'Nothing in the wash — enjoy the calm.'
            : `${laundryOutfits.length} outfit${laundryOutfits.length > 1 ? 's' : ''} soaking`}
        </p>
        <p className="max-w-xs text-center text-xs" style={{ color: 'var(--color-ink-soft)' }}>
          No rush and no red flags here — the glass just fills gently. Mark items done whenever they're actually ready.
        </p>
      </div>

      {showSettings && (
        <div className="animate-rise mb-6 rounded-2xl p-4" style={{ background: 'white', border: '1px solid var(--color-mist-2)' }}>
          <div className="mb-4">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-ink-soft)' }}>
              Default laundry time
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((d) => (
                <button
                  key={d}
                  onClick={() => setLaundryDays(d)}
                  className="flex-1 rounded-xl py-2 text-sm font-medium"
                  style={{
                    background: (meta?.laundryDays ?? 2) === d ? 'var(--color-blue)' : 'var(--color-mist)',
                    color: (meta?.laundryDays ?? 2) === d ? 'white' : 'var(--color-ink-soft)',
                  }}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-ink-soft)' }}>
              Dress of the Day notification
            </label>
            {notifSupported ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => (meta?.notificationsEnabled ? disableNotifications() : enableNotifications())}
                  className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium"
                  style={{
                    background: meta?.notificationsEnabled ? 'var(--color-blue)' : 'var(--color-mist)',
                    color: meta?.notificationsEnabled ? 'white' : 'var(--color-ink-soft)',
                  }}
                >
                  {meta?.notificationsEnabled ? <Bell size={14} /> : <BellOff size={14} />}
                  {meta?.notificationsEnabled ? 'On' : 'Off'}
                </button>
                <input
                  type="time"
                  value={meta?.notificationTime || '07:30'}
                  onChange={(e) => setNotificationTime(e.target.value)}
                  className="rounded-xl border px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--color-mist-2)' }}
                />
              </div>
            ) : (
              <p className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>
                Notifications aren't supported in this browser — WearNext will remind you inside the app instead.
              </p>
            )}
            <p className="mt-2 text-[11px]" style={{ color: 'var(--color-ink-soft)' }}>
              Free, on-device reminders — no push server, no cost, works fully offline once enabled.
            </p>
          </div>
        </div>
      )}

      {laundryOutfits.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <Shirt size={28} style={{ color: 'var(--color-ink-soft)' }} />
          <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>Your laundry queue is empty.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {laundryOutfits.map((o) => {
            const rem = timeRemainingLabel(o.laundryDueAt)
            return (
              <li key={o.id} className="flex items-center gap-3 rounded-2xl p-3" style={{ background: 'white', border: '1px solid var(--color-mist-2)' }}>
                {o.image ? (
                  <img src={o.image} alt={o.name} className="h-16 w-16 rounded-xl object-cover" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-xl" style={{ background: o.hex }}>
                    <Shirt size={22} color="white" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>{o.name}</p>
                  <p className="text-xs" style={{ color: 'var(--color-blue)' }}>{rem.text}</p>
                </div>
                <button
                  onClick={() => markLaundryDone(o.id)}
                  className="flex items-center gap-1 rounded-full px-3 py-2 text-xs font-semibold text-white"
                  style={{ background: 'var(--color-blue)' }}
                >
                  <Check size={13} /> Done
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
