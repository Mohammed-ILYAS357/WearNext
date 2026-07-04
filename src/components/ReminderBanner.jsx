import { Droplets, X } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function ReminderBanner({ reminder, onDismiss }) {
  if (!reminder) return null

  return (
    <div
      className="animate-rise mx-4 mt-4 flex items-center gap-3 rounded-2xl px-4 py-3 shadow-sm"
      style={{ background: 'var(--color-mist)', border: '1px solid var(--color-mist-2)' }}
      role="status"
    >
      <Droplets size={18} style={{ color: 'var(--color-blue)' }} className="shrink-0" />
      <p className="flex-1 text-sm" style={{ color: 'var(--color-ink)' }}>{reminder.message}</p>
      <Link
        to="/laundry"
        className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold text-white"
        style={{ background: 'var(--color-blue)' }}
      >
        Open Laundry
      </Link>
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Dismiss reminder"
          className="shrink-0 rounded-full p-1 text-[var(--color-ink-soft)] hover:bg-white/60"
        >
          <X size={16} />
        </button>
      )}
    </div>
  )
}
