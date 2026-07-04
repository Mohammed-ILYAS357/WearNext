import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { DndContext, PointerSensor, TouchSensor, useSensor, useSensors, useDraggable } from '@dnd-kit/core'
import { Shirt, Sparkles, Plus, GripVertical, Moon, Droplets } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { readableTextOn } from '../utils/color'
import LaundryDropZone from '../components/LaundryDropZone'
import ReminderBanner from '../components/ReminderBanner'
import WardrobeSummary from '../components/WardrobeSummary'

function DraggableHero({ outfit, textColor }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: outfit.id,
    data: { outfit },
  })

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0) rotate(${transform.x / 40}deg)` }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative touch-none select-none ${isDragging ? 'z-30 cursor-grabbing' : 'cursor-grab'}`}
      {...listeners}
      {...attributes}
    >
      {outfit.image ? (
        <img
          src={outfit.image}
          alt={outfit.name}
          className="h-[46vh] w-full max-w-sm rounded-[2rem] object-cover shadow-2xl"
          draggable={false}
        />
      ) : (
        <div
          className="flex h-[46vh] w-full max-w-sm flex-col items-center justify-center gap-3 rounded-[2rem] shadow-2xl"
          style={{ background: outfit.hex }}
        >
          <Shirt size={64} color={textColor} strokeWidth={1.4} />
          <span className="font-display px-8 text-center text-2xl" style={{ color: textColor }}>{outfit.name}</span>
        </div>
      )}
      <div
        className="absolute right-3 top-3 flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[10px] font-semibold backdrop-blur-md"
        style={{ background: 'rgba(11,37,69,0.45)', color: '#F7FBFF' }}
      >
        <GripVertical size={12} /> Drag to laundry
      </div>
    </div>
  )
}

export default function Home() {
  const { loading, todayOutfit, outfits, meta, sendToLaundry, reminder, dismissReminder } = useApp()
  const [justSent, setJustSent] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } })
  )

  const textColor = todayOutfit ? readableTextOn(todayOutfit.color) : '#0B2545'

  const dateLabel = useMemo(() => {
    return new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })
  }, [])

  function handleDragEnd(event) {
    const { over, active } = event
    if (over && over.id === 'laundry-zone') {
      sendToLaundry(active.id)
      setJustSent(true)
      setTimeout(() => setJustSent(false), 2200)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="gentle-pulse font-display text-lg" style={{ color: 'var(--color-blue)' }}>Waking up your wardrobe…</div>
      </div>
    )
  }

  if (outfits.length === 0) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-5 px-8 text-center">
        <Sparkles size={40} style={{ color: 'var(--color-blue)' }} />
        <h1 className="font-display text-3xl" style={{ color: 'var(--color-ink)' }}>Your wardrobe is empty</h1>
        <p className="max-w-xs text-sm" style={{ color: 'var(--color-ink-soft)' }}>
          Add your first outfit and WearNext will pick what you wear tomorrow morning — automatically.
        </p>
        <Link
          to="/add"
          className="flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white shadow-lg"
          style={{ background: 'var(--color-blue)' }}
        >
          <Plus size={16} /> Add your first outfit
        </Link>
      </div>
    )
  }

  // Nothing revealed for today. Two distinct reasons, two distinct messages:
  const waitingForBoundary = !todayOutfit && meta?.pendingReveal
  const trulyAllInLaundry = !todayOutfit && !meta?.pendingReveal

  if (waitingForBoundary || trulyAllInLaundry) {
    return (
      <div className="flex min-h-screen flex-col pb-28">
        <ReminderBanner reminder={reminder} onDismiss={dismissReminder} />
        <div className="flex flex-col items-center justify-center gap-5 px-8 pb-8 pt-10 text-center">
          {waitingForBoundary ? (
            <>
              <Moon size={40} style={{ color: 'var(--color-blue)' }} />
              <h1 className="font-display text-3xl" style={{ color: 'var(--color-ink)' }}>All done for today</h1>
              <p className="max-w-xs text-sm" style={{ color: 'var(--color-ink-soft)' }}>
                You've already sent today's pick to laundry. Your next Dress of the Day arrives at 6:00 AM.
              </p>
            </>
          ) : (
            <>
              <Droplets size={40} style={{ color: 'var(--color-blue)' }} />
              <h1 className="font-display text-3xl" style={{ color: 'var(--color-ink)' }}>Everything's in the wash</h1>
              <p className="max-w-xs text-sm" style={{ color: 'var(--color-ink-soft)' }}>
                Every outfit is currently in laundry. Mark one done and it'll appear here right away.
              </p>
              <Link to="/laundry" className="rounded-full px-6 py-3 text-sm font-semibold text-white shadow-lg" style={{ background: 'var(--color-blue)' }}>
                Go to Laundry
              </Link>
            </>
          )}
        </div>
        <WardrobeSummary />
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex min-h-screen flex-col pb-28">
        <ReminderBanner reminder={reminder} onDismiss={dismissReminder} />

        <header className="px-6 pt-6 text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em]" style={{ color: 'var(--color-ink-soft)' }}>{dateLabel}</p>
          <h1 className="font-display mt-1 text-3xl" style={{ color: 'var(--color-ink)' }}>Dress of the Day</h1>
        </header>

        <main className="flex flex-col items-center gap-5 px-6 py-6">
          <DraggableHero outfit={todayOutfit} textColor={textColor} />

          <div className="w-full max-w-sm text-center">
            <h2 className="font-display text-2xl" style={{ color: 'var(--color-ink)' }}>{todayOutfit.name}</h2>
            <div className="mt-2 flex items-center justify-center gap-2">
              <span
                className="rounded-full px-3 py-1 text-[11px] font-semibold"
                style={{ background: 'var(--color-mist)', color: 'var(--color-blue-deep)' }}
              >
                {todayOutfit.category}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: 'var(--color-ink-soft)' }}>
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: todayOutfit.hex }} />
                worn {todayOutfit.wearCount || 0}×
              </span>
            </div>
            {todayOutfit.notes && (
              <p className="mt-3 text-sm" style={{ color: 'var(--color-ink-soft)' }}>{todayOutfit.notes}</p>
            )}
          </div>

          <LaundryDropZone active={!justSent} />

          {justSent && (
            <p className="animate-rise text-sm font-medium" style={{ color: 'var(--color-blue)' }}>
              Sent to laundry — your next pick arrives at 6:00 AM tomorrow.
            </p>
          )}
        </main>

        <div className="mt-4">
          <WardrobeSummary />
        </div>
      </div>
    </DndContext>
  )
}
