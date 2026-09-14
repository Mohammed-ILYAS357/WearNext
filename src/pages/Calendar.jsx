import { useMemo, useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight, X, Droplets, Shirt, Star, ArrowLeftRight } from 'lucide-react'
import { DndContext, PointerSensor, TouchSensor, useSensor, useSensors, useDraggable, useDroppable } from '@dnd-kit/core'
import { useApp } from '../context/AppContext'
import { readableTextOn } from '../utils/color'
import LaundryDropZone from '../components/LaundryDropZone'
import { appDayKey, daysBetweenKeys, todayKey } from '../db/db'

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

// ─── Sub-components ───────────────────────────────────────────────────────────

function OutfitCard({ outfit, textColor, draggable = false }) {
  const drag = useDraggable({
    id: `sheet-${outfit.id}`,
    data: { outfit },
    disabled: !draggable,
  })
  const style = drag.transform
    ? { transform: `translate3d(${drag.transform.x}px, ${drag.transform.y}px, 0)` }
    : undefined

  return (
    <div
      ref={draggable ? drag.setNodeRef : undefined}
      style={style}
      {...(draggable ? drag.listeners : {})}
      {...(draggable ? drag.attributes : {})}
      className={draggable ? `touch-none select-none ${drag.isDragging ? 'z-30 cursor-grabbing' : 'cursor-grab'}` : ''}
    >
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

// Future-day tile: both draggable (same-month swap via drag) AND tappable
// (initiates the cross-month "tap to select → navigate → tap to complete" flow).
function FutureDayCell({ cell, outfit, isSuggested, isSwapPending, onTap }) {
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: `day-${cell.key}`,
    data: { dateKey: cell.key, outfit },
    disabled: !outfit,
  })
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `day-${cell.key}`,
    data: { dateKey: cell.key },
  })
  const setRefs = useCallback((node) => { setDragRef(node); setDropRef(node) }, [setDragRef, setDropRef])

  // Visual states (priority order):
  // 1. This cell is the pending swap source → strong blue ring + pulse
  // 2. Drag is over this cell → blue ring
  // 3. Normal
  const ringStyle = isSwapPending
    ? '0 0 0 3px var(--color-blue)'
    : isOver
      ? '0 0 0 2px var(--color-sky)'
      : 'none'

  return (
    <button
      ref={setRefs}
      {...(outfit ? listeners : {})}
      {...(outfit ? attributes : {})}
      onClick={() => outfit && onTap(cell.key)}
      disabled={!outfit}
      className={`relative flex aspect-square touch-none select-none flex-col items-center justify-center rounded-xl text-xs font-medium transition-all active:scale-95 ${isDragging ? 'z-20 opacity-40' : ''} ${outfit ? 'cursor-grab' : ''} ${isSwapPending ? 'gentle-pulse' : ''}`}
      style={{
        background: outfit ? outfit.hex : 'var(--color-mist)',
        color: outfit ? readableTextOn(outfit.color) : 'var(--color-ink-soft)',
        boxShadow: ringStyle,
        opacity: outfit ? 1 : 0.45,
      }}
    >
      {cell.day}
      {isSuggested && !isSwapPending && (
        <Star size={8} className="absolute right-0.5 top-0.5" fill="white" color="white" style={{ opacity: 0.85 }} />
      )}
      {isSwapPending && (
        <ArrowLeftRight size={9} className="absolute right-0.5 top-0.5" color="white" style={{ opacity: 0.9 }} />
      )}
    </button>
  )
}

// ─── Main Calendar ────────────────────────────────────────────────────────────

export default function Calendar() {
  const { outfits, history, sendToLaundry, getScheduledOutfitForDate, swapScheduledDates, meta } = useApp()

  const [cursor, setCursor] = useState(() => {
    const d = new Date(); d.setDate(1); return d
  })
  const [selectedDate, setSelectedDate] = useState(null)  // for day-detail sheet
  const [justSent, setJustSent] = useState(false)

  // Cross-month swap: { dateKey, outfitName } while waiting for the 2nd tap.
  const [swapPending, setSwapPending] = useState(null)
  const [swapDone, setSwapDone] = useState(null)   // confirmation message

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

  // Least-worn upcoming outfit → star indicator
  const suggestedId = useMemo(() => {
    const upcoming = cells
      .filter((c) => c && c.offset > 0)
      .map((c) => getScheduledOutfitForDate(c.key))
      .filter(Boolean)
    if (!upcoming.length) return null
    return upcoming.reduce((min, o) => ((o.wearCount || 0) < (min.wearCount || 0) ? o : min)).id
  }, [cells, getScheduledOutfitForDate])

  // ── Resolve the outfit to display for any given cell ──────────────────────
  function resolveOutfitForCell(cell) {
    // Past days: confirmed history first, then 14-day carry-forward
    if (cell.offset < 0) {
      const entry = history[cell.key]
      if (entry) return { ...outfitById[entry.outfitId], _confirmed: true }
      const [y, mo, d] = cell.key.split('-').map(Number)
      for (let back = 1; back <= 14; back++) {
        const prev = new Date(y, mo - 1, d - back)
        const pk = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-${String(prev.getDate()).padStart(2, '0')}`
        if (history[pk]) {
          const o = outfitById[history[pk].outfitId]
          return o ? { ...o, _inferred: true } : null
        }
      }
      return null
    }
    // Today: prefer confirmed history, fall back to live slot
    if (cell.offset === 0) {
      const entry = history[cell.key]
      if (entry) return { ...outfitById[entry.outfitId], _confirmed: true }
      return getScheduledOutfitForDate(cell.key)
    }
    // Future: queue-based scheduling
    return getScheduledOutfitForDate(cell.key)
  }

  // ── Tap handler for future-day cells ──────────────────────────────────────
  // Supports two modes:
  //   Normal mode : tap → open detail sheet
  //   Swap mode   : first tap → sets swapPending
  //                 second tap (any month) → executes swap
  function handleFutureCellTap(dateKey) {
    if (!swapPending) {
      // Normal tap: open detail sheet
      setSelectedDate(dateKey)
      return
    }
    if (swapPending.dateKey === dateKey) {
      // Tapped the same cell → cancel swap mode
      setSwapPending(null)
      return
    }
    // Two different future days selected → swap them
    swapScheduledDates(swapPending.dateKey, dateKey)
    const o = getScheduledOutfitForDate(dateKey)
    setSwapDone(`Swapped! ${swapPending.outfitName} ↔ ${o?.name || 'the other outfit'}`)
    setSwapPending(null)
    setTimeout(() => setSwapDone(null), 2800)
  }

  // ── Drag-end (same-month tile ↔ tile, or sheet → laundry zone) ────────────
  function handleDragEnd(event) {
    const { over, active } = event
    if (!over || !active) return

    // Sheet card dragged to laundry zone
    if (over.id === 'laundry-zone' && String(active.id).startsWith('sheet-')) {
      const id = String(active.id).replace('sheet-', '')
      sendToLaundry(id)
      setJustSent(true)
      setTimeout(() => { setJustSent(false); setSelectedDate(null) }, 1600)
      return
    }

    // Day tile dragged onto another day tile (same-month)
    if (String(active.id).startsWith('day-') && String(over.id).startsWith('day-')) {
      const dateA = active.data.current?.dateKey
      const dateB = over.data.current?.dateKey
      if (dateA && dateB && dateA !== dateB) {
        swapScheduledDates(dateA, dateB)
        const outfitA = active.data.current?.outfit
        setSwapDone(outfitA ? `Swapped! ${outfitA.name} moved to its new date.` : 'Outfits swapped.')
        setTimeout(() => setSwapDone(null), 2800)
      }
    }
  }

  // ── Detail sheet helpers ───────────────────────────────────────────────────
  const selectedCell = selectedDate ? cells.find((c) => c && c.key === selectedDate) : null
  const selectedOutfit = selectedCell ? resolveOutfitForCell(selectedCell) : null
  const isSelectedToday = selectedCell?.offset === 0 && !history[selectedCell?.key]
  const isSelectedFuture = (selectedCell?.offset ?? -1) > 0
  const textColor = selectedOutfit ? readableTextOn(selectedOutfit.color) : '#0B2545'

  function navigateMonth(dir) {
    setCursor((c) => {
      const n = new Date(c)
      n.setMonth(n.getMonth() + dir)
      return n
    })
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="min-h-screen px-5 pb-28 pt-8">

        {/* Header */}
        <header className="mb-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em]" style={{ color: 'var(--color-ink-soft)' }}>
            History &amp; upcoming
          </p>
          <h1 className="font-display text-3xl" style={{ color: 'var(--color-ink)' }}>Calendar</h1>
        </header>

        {/* Cross-month swap banner */}
        {swapPending ? (
          <div
            className="animate-rise mb-4 flex items-center gap-3 rounded-2xl px-4 py-3"
            style={{ background: 'var(--color-blue)', color: 'white' }}
          >
            <ArrowLeftRight size={16} className="gentle-pulse shrink-0" />
            <p className="flex-1 text-sm font-medium">
              Tap any future day to swap with <span className="font-semibold">{swapPending.outfitName}</span>
              <span className="ml-1 text-[11px] opacity-75">— navigate months freely</span>
            </p>
            <button
              onClick={() => setSwapPending(null)}
              className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold"
              style={{ background: 'rgba(255,255,255,0.2)' }}
            >
              Cancel
            </button>
          </div>
        ) : swapDone ? (
          <div
            className="animate-rise mb-4 rounded-2xl px-4 py-3 text-center text-sm font-medium"
            style={{ background: 'var(--color-mist)', color: 'var(--color-blue)' }}
          >
            ✓ {swapDone}
          </div>
        ) : null}

        {/* Month navigation */}
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={() => navigateMonth(-1)}
            className="rounded-full p-2.5 transition-opacity active:opacity-60"
            style={{ background: 'var(--color-mist)' }}
            aria-label="Previous month"
          >
            <ChevronLeft size={18} style={{ color: 'var(--color-blue)' }} />
          </button>
          <span className="font-display text-lg" style={{ color: 'var(--color-ink)' }}>{monthLabel}</span>
          <button
            onClick={() => navigateMonth(1)}
            className="rounded-full p-2.5 transition-opacity active:opacity-60"
            style={{ background: 'var(--color-mist)' }}
            aria-label="Next month"
          >
            <ChevronRight size={18} style={{ color: 'var(--color-blue)' }} />
          </button>
        </div>

        {/* Weekday labels */}
        <div className="mb-2 grid grid-cols-7 gap-1 text-center">
          {WEEKDAYS.map((w, i) => (
            <span key={i} className="text-[11px] font-semibold" style={{ color: 'var(--color-ink-soft)' }}>{w}</span>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1.5">
          {cells.map((cell, i) => {
            if (!cell) return <div key={i} />

            const outfit = resolveOutfitForCell(cell)
            const isToday = cell.offset === 0
            const isFuture = cell.offset > 0
            const isPast = cell.offset < 0
            const isSwapPendingCell = swapPending?.dateKey === cell.key

            // ── Future days: draggable + tappable for cross-month swap ──
            if (isFuture) {
              return (
                <FutureDayCell
                  key={cell.key}
                  cell={cell}
                  outfit={outfit}
                  isSuggested={outfit?.id === suggestedId && !swapPending}
                  isSwapPending={isSwapPendingCell}
                  onTap={handleFutureCellTap}
                />
              )
            }

            // ── Past days + today ──
            return (
              <button
                key={cell.key}
                onClick={() => outfit && !outfit._inferred && setSelectedDate(cell.key)}
                disabled={!outfit || outfit._inferred}
                className="relative flex aspect-square flex-col items-center justify-center rounded-xl text-xs font-medium transition-transform active:scale-95"
                style={{
                  background: outfit ? outfit.hex : 'var(--color-mist)',
                  color: outfit ? readableTextOn(outfit.color) : 'var(--color-ink-soft)',
                  boxShadow: isToday ? '0 0 0 2.5px var(--color-blue)' : 'none',
                  opacity: outfit ? (outfit._inferred ? 0.50 : 1) : 0.38,
                }}
              >
                {cell.day}
                {/* Dot = inferred/carry-forward day */}
                {outfit?._inferred && (
                  <span
                    className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.65)' }}
                  />
                )}
              </button>
            )
          })}
        </div>

        {/* Legend */}
        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px]" style={{ color: 'var(--color-ink-soft)' }}>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded" style={{ background: 'var(--color-mist)', opacity: 0.5 }} />
            No outfit
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded" style={{ boxShadow: '0 0 0 2px var(--color-blue)' }} />
            Today
          </span>
          <span className="flex items-center gap-1.5">
            <span className="relative flex h-3 w-3 items-end justify-center rounded" style={{ background: 'var(--color-sky)', opacity: 0.5 }}>
              <span className="mb-0.5 h-0.5 w-0.5 rounded-full bg-white" />
            </span>
            Inferred
          </span>
          <span className="flex items-center gap-1.5">
            <Star size={10} fill="var(--color-blue)" color="var(--color-blue)" />
            Wear sooner
          </span>
          <span className="flex items-center gap-1.5">
            <ArrowLeftRight size={10} style={{ color: 'var(--color-blue)' }} />
            Tap future to swap
          </span>
        </div>

        {/* ── Day-detail bottom sheet ── */}
        {selectedDate && selectedOutfit && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center"
            style={{ background: 'rgba(11,37,69,0.4)' }}
            onClick={() => setSelectedDate(null)}
          >
            <div
              className="animate-rise w-full max-w-md rounded-t-[2rem] px-6 pb-10 pt-5"
              style={{ background: 'var(--color-canvas)' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Sheet header */}
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <p className="font-mono text-xs" style={{ color: 'var(--color-ink-soft)' }}>
                    {new Date(selectedDate + 'T00:00').toLocaleDateString(undefined, {
                      weekday: 'long', day: 'numeric', month: 'long',
                    })}
                  </p>
                  <span
                    className="mt-1 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                    style={{
                      background: isSelectedToday
                        ? 'var(--color-blue)'
                        : isSelectedFuture
                          ? 'var(--color-mist)'
                          : 'var(--color-mist)',
                      color: isSelectedToday ? 'white' : 'var(--color-blue-deep)',
                    }}
                  >
                    {isSelectedToday ? 'Today' : isSelectedFuture ? 'Upcoming' : 'History'}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedDate(null)}
                  className="rounded-full p-1.5"
                  style={{ background: 'var(--color-mist)' }}
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Outfit photo / card */}
              <OutfitCard
                outfit={selectedOutfit}
                textColor={textColor}
                draggable={isSelectedToday}
              />

              {/* Outfit meta */}
              <h2 className="font-display mt-4 text-xl" style={{ color: 'var(--color-ink)' }}>
                {selectedOutfit.name}
              </h2>
              <div className="mt-1 flex items-center gap-2">
                <span
                  className="rounded-full px-3 py-1 text-[11px] font-semibold"
                  style={{ background: 'var(--color-mist)', color: 'var(--color-blue-deep)' }}
                >
                  {selectedOutfit.category}
                </span>
                <span className="text-[11px]" style={{ color: 'var(--color-ink-soft)' }}>
                  worn {selectedOutfit.wearCount || 0}×
                </span>
              </div>
              {selectedOutfit.notes ? (
                <p className="mt-2 text-sm" style={{ color: 'var(--color-ink-soft)' }}>{selectedOutfit.notes}</p>
              ) : null}

              {/* Future day: swap CTA */}
              {isSelectedFuture && (
                <button
                  onClick={() => {
                    setSwapPending({ dateKey: selectedDate, outfitName: selectedOutfit.name })
                    setSelectedDate(null)
                  }}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold"
                  style={{ background: 'var(--color-mist)', color: 'var(--color-blue)' }}
                >
                  <ArrowLeftRight size={15} />
                  Swap with another day
                </button>
              )}

              {/* Today: laundry drop zone */}
              {isSelectedToday && (
                selectedOutfit.status === 'laundry' ? (
                  <p className="mt-4 flex items-center gap-2 text-sm" style={{ color: 'var(--color-blue)' }}>
                    <Droplets size={16} /> Already in the wash
                  </p>
                ) : (
                  <div className="mt-4">
                    <LaundryDropZone active={!justSent} />
                    {justSent && (
                      <p className="animate-rise mt-2 text-center text-sm font-medium" style={{ color: 'var(--color-blue)' }}>
                        Sent to laundry.
                      </p>
                    )}
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
