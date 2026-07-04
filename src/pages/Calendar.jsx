import { useMemo, useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight, X, Droplets, Shirt, Star, GripVertical } from 'lucide-react'
import { DndContext, PointerSensor, TouchSensor, useSensor, useSensors, useDraggable, useDroppable } from '@dnd-kit/core'
import { useApp } from '../context/AppContext'
import { readableTextOn } from '../utils/color'
import LaundryDropZone from '../components/LaundryDropZone'
import { appDayKey, daysBetweenKeys, todayKey } from '../db/db'

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function DraggableSheetCard({ outfit, textColor }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `sheet-${outfit.id}`,
    data: { outfit },
  })
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className={`touch-none select-none ${isDragging ? 'z-30 cursor-grabbing' : 'cursor-grab'}`}>
      {outfit.image ? (
        <img src={outfit.image} alt={outfit.name} className="h-52 w-full rounded-2xl object-cover shadow-md" draggable={false} />
      ) : (
        <div className="flex h-52 w-full flex-col items-center justify-center gap-2 rounded-2xl shadow-md" style={{ background: outfit.hex }}>
          <Shirt size={40} color={textColor} strokeWidth={1.4} />
          <span className="font-display px-6 text-center text-lg" style={{ color: textColor }}>{outfit.name}</span>
        </div>
      )}
    </div>
  )
}

// A future-day calendar tile: draggable AND droppable, so any two future
// tiles can be swapped by dragging one onto the other.
function FutureDayCell({ cell, outfit, isSuggested, onTap }) {
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: `day-${cell.key}`,
    data: { dateKey: cell.key, outfit },
    disabled: !outfit,
  })
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: `day-${cell.key}`, data: { dateKey: cell.key } })

  const setRefs = useCallback((node) => { setDragRef(node); setDropRef(node) }, [setDragRef, setDropRef])

  return (
    <button
      ref={setRefs}
      {...(outfit ? listeners : {})}
      {...(outfit ? attributes : {})}
      onClick={() => outfit && onTap(cell.key)}
      disabled={!outfit}
      className={`relative flex aspect-square touch-none select-none flex-col items-center justify-center rounded-xl text-xs font-medium transition-transform ${isDragging ? 'z-20 opacity-40' : ''} ${outfit ? 'cursor-grab active:scale-95' : ''}`}
      style={{
        background: outfit ? outfit.hex : 'var(--color-mist)',
        color: outfit ? readableTextOn(outfit.color) : 'var(--color-ink-soft)',
        boxShadow: isOver ? '0 0 0 2px var(--color-blue)' : 'none',
        opacity: outfit ? 1 : 0.55,
      }}
    >
      {cell.day}
      {isSuggested && (
        <Star size={9} className="absolute right-0.5 top-0.5" fill="white" color="white" style={{ opacity: 0.85 }} />
      )}
    </button>
  )
}

export default function Calendar() {
  const { outfits, history, sendToLaundry, getScheduledOutfitForDate, swapScheduledDates, meta } = useApp()
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d })
  const [selectedDate, setSelectedDate] = useState(null)
  const [justSent, setJustSent] = useState(false)
  const [swapHint, setSwapHint] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } })
  )

  const outfitById = useMemo(() => {
    const map = {}
    outfits.forEach((o) => { map[o.id] = o })
    return map
  }, [outfits])

  const currentAppDay = meta?.todayDate || appDayKey()
  const monthLabel = cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  const cells = useMemo(() => {
    const year = cursor.getFullYear()
    const month = cursor.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const arr = []
    for (let i = 0; i < firstDay; i++) arr.push(null)
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d)
      const key = todayKey(date)
      const offset = daysBetweenKeys(currentAppDay, key)
      arr.push({ day: d, key, offset })
    }
    return arr
  }, [cursor, currentAppDay])

  // Which upcoming outfit has the lowest wear count — a gentle nudge that it
  // might be worth wearing sooner rather than later.
  const suggestedId = useMemo(() => {
    const upcoming = cells
      .filter((c) => c && c.offset > 0)
      .map((c) => getScheduledOutfitForDate(c.key))
      .filter(Boolean)
    if (upcoming.length === 0) return null
    return upcoming.reduce((min, o) => ((o.wearCount || 0) < (min.wearCount || 0) ? o : min)).id
  }, [cells, getScheduledOutfitForDate])

  function resolveOutfitForCell(cell) {
    if (cell.offset < 0) {
      const entry = history[cell.key]
      return entry ? outfitById[entry.outfitId] : null
    }
    if (cell.offset === 0) {
      // If today's pick has already been logged (e.g. sent to laundry
      // earlier today), show what was actually worn rather than going blank
      // just because the live "today" slot has since been cleared.
      const entry = history[cell.key]
      if (entry) return outfitById[entry.outfitId]
      return getScheduledOutfitForDate(cell.key)
    }
    return getScheduledOutfitForDate(cell.key)
  }

  const selectedCell = selectedDate ? cells.find((c) => c && c.key === selectedDate) : null
  const selectedOutfit = selectedCell ? resolveOutfitForCell(selectedCell) : null
  // "Still actionable today" — today's slot, not yet logged/laundered — is
  // the only case that gets the drag-to-laundry interaction. Once it's
  // logged, today behaves like a read-only history entry (same as the past).
  const isSelectedToday = selectedCell?.offset === 0 && !history[selectedCell.key]
  const textColor = selectedOutfit ? readableTextOn(selectedOutfit.color) : '#0B2545'

  function handleDragEnd(event) {
    const { over, active } = event
    if (!over || !active) return

    // Drag from the day-detail sheet onto the laundry zone (today only).
    if (over.id === 'laundry-zone' && String(active.id).startsWith('sheet-')) {
      const id = String(active.id).replace('sheet-', '')
      sendToLaundry(id)
      setJustSent(true)
      setTimeout(() => { setJustSent(false); setSelectedDate(null) }, 1600)
      return
    }

    // Drag one future day tile onto another future day tile -> swap.
    if (String(active.id).startsWith('day-') && String(over.id).startsWith('day-')) {
      const dateA = active.data.current?.dateKey
      const dateB = over.data.current?.dateKey
      if (dateA && dateB && dateA !== dateB) {
        swapScheduledDates(dateA, dateB)
        const outfitA = active.data.current?.outfit
        setSwapHint(outfitA ? `Swapped — ${outfitA.name} moved to its new day.` : 'Swapped.')
        setTimeout(() => setSwapHint(null), 2000)
      }
    }
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="min-h-screen px-6 pb-28 pt-8">
        <header className="mb-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em]" style={{ color: 'var(--color-ink-soft)' }}>History &amp; upcoming</p>
          <h1 className="font-display text-3xl" style={{ color: 'var(--color-ink)' }}>Calendar</h1>
        </header>

        <div className="mb-4 flex items-center justify-between">
          <button onClick={() => setCursor((c) => { const n = new Date(c); n.setMonth(n.getMonth() - 1); return n })} className="rounded-full p-2" style={{ background: 'var(--color-mist)' }} aria-label="Previous month">
            <ChevronLeft size={18} style={{ color: 'var(--color-blue)' }} />
          </button>
          <span className="font-display text-lg" style={{ color: 'var(--color-ink)' }}>{monthLabel}</span>
          <button onClick={() => setCursor((c) => { const n = new Date(c); n.setMonth(n.getMonth() + 1); return n })} className="rounded-full p-2" style={{ background: 'var(--color-mist)' }} aria-label="Next month">
            <ChevronRight size={18} style={{ color: 'var(--color-blue)' }} />
          </button>
        </div>

        <div className="mb-2 grid grid-cols-7 gap-1 text-center">
          {WEEKDAYS.map((w, i) => (
            <span key={i} className="text-[11px] font-semibold" style={{ color: 'var(--color-ink-soft)' }}>{w}</span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {cells.map((cell, i) => {
            if (!cell) return <div key={i} />
            const outfit = resolveOutfitForCell(cell)
            const isToday = cell.offset === 0
            const isFuture = cell.offset > 0

            if (isFuture) {
              return (
                <FutureDayCell
                  key={cell.key}
                  cell={cell}
                  outfit={outfit}
                  isSuggested={outfit?.id === suggestedId}
                  onTap={setSelectedDate}
                />
              )
            }

            return (
              <button
                key={cell.key}
                onClick={() => outfit && setSelectedDate(cell.key)}
                disabled={!outfit}
                className="relative flex aspect-square flex-col items-center justify-center rounded-xl text-xs font-medium transition-transform active:scale-95"
                style={{
                  background: outfit ? outfit.hex : 'var(--color-mist)',
                  color: outfit ? readableTextOn(outfit.color) : 'var(--color-ink-soft)',
                  boxShadow: isToday ? '0 0 0 2px var(--color-blue)' : 'none',
                  opacity: outfit ? 1 : 0.6,
                }}
              >
                {cell.day}
              </button>
            )
          })}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px]" style={{ color: 'var(--color-ink-soft)' }}>
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded" style={{ background: 'var(--color-mist)' }} /> No outfit</span>
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded" style={{ boxShadow: '0 0 0 2px var(--color-blue)' }} /> Today</span>
          <span className="flex items-center gap-1"><Star size={10} fill="var(--color-blue)" color="var(--color-blue)" /> Worn least — consider moving sooner</span>
          <span className="flex items-center gap-1"><GripVertical size={12} /> Drag future days to swap</span>
        </div>

        {swapHint && (
          <p className="animate-rise mt-3 text-center text-xs font-medium" style={{ color: 'var(--color-blue)' }}>{swapHint}</p>
        )}

        {/* Day detail sheet */}
        {selectedDate && selectedOutfit && (
          <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(11,37,69,0.4)' }} onClick={() => setSelectedDate(null)}>
            <div
              className="animate-rise w-full max-w-md rounded-t-[2rem] px-6 pb-10 pt-5"
              style={{ background: 'var(--color-canvas)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="font-mono text-xs" style={{ color: 'var(--color-ink-soft)' }}>
                  {new Date(selectedDate + 'T00:00').toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
                  {selectedCell?.offset > 0 && <span className="ml-1.5 rounded-full px-2 py-0.5" style={{ background: 'var(--color-mist)' }}>Upcoming</span>}
                  {selectedCell?.offset === 0 && isSelectedToday && <span className="ml-1.5 rounded-full px-2 py-0.5" style={{ background: 'var(--color-mist)' }}>Today</span>}
                  {(selectedCell?.offset < 0 || (selectedCell?.offset === 0 && !isSelectedToday)) && <span className="ml-1.5 rounded-full px-2 py-0.5" style={{ background: 'var(--color-mist)' }}>History</span>}
                </span>
                <button onClick={() => setSelectedDate(null)} aria-label="Close" className="rounded-full p-1.5" style={{ background: 'var(--color-mist)' }}>
                  <X size={16} />
                </button>
              </div>

              {isSelectedToday ? (
                <DraggableSheetCard outfit={selectedOutfit} textColor={textColor} />
              ) : (
                selectedOutfit.image ? (
                  <img src={selectedOutfit.image} alt={selectedOutfit.name} className="h-52 w-full rounded-2xl object-cover shadow-md" />
                ) : (
                  <div className="flex h-52 w-full flex-col items-center justify-center gap-2 rounded-2xl shadow-md" style={{ background: selectedOutfit.hex }}>
                    <Shirt size={40} color={textColor} strokeWidth={1.4} />
                    <span className="font-display px-6 text-center text-lg" style={{ color: textColor }}>{selectedOutfit.name}</span>
                  </div>
                )
              )}

              <h2 className="font-display mt-4 text-xl" style={{ color: 'var(--color-ink)' }}>{selectedOutfit.name}</h2>
              <div className="mt-1 flex items-center gap-2">
                <span className="inline-block rounded-full px-3 py-1 text-[11px] font-semibold" style={{ background: 'var(--color-mist)', color: 'var(--color-blue-deep)' }}>
                  {selectedOutfit.category}
                </span>
                <span className="text-[11px]" style={{ color: 'var(--color-ink-soft)' }}>worn {selectedOutfit.wearCount || 0}×</span>
              </div>

              {selectedCell?.offset > 0 && (
                <p className="mt-3 text-xs" style={{ color: 'var(--color-ink-soft)' }}>
                  This is the current plan for this day — drag its tile onto another future day on the calendar to swap them.
                </p>
              )}

              {isSelectedToday && (
                selectedOutfit.status === 'laundry' ? (
                  <p className="mt-4 flex items-center gap-2 text-sm" style={{ color: 'var(--color-blue)' }}>
                    <Droplets size={16} /> Already in the wash
                  </p>
                ) : (
                  <div className="mt-4">
                    <LaundryDropZone active={!justSent} />
                    {justSent && <p className="animate-rise mt-2 text-center text-sm font-medium" style={{ color: 'var(--color-blue)' }}>Sent to laundry.</p>}
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </DndContext>
  )
}
