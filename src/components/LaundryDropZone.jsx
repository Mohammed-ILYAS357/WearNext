import { useDroppable } from '@dnd-kit/core'
import { Droplets } from 'lucide-react'

export default function LaundryDropZone({ id = 'laundry-zone', active }) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div
      ref={setNodeRef}
      className="flex flex-col items-center justify-center gap-1.5 rounded-3xl border-2 border-dashed px-6 py-4 transition-all duration-200"
      style={{
        borderColor: isOver ? 'var(--color-blue)' : 'var(--color-mist-2)',
        background: isOver ? 'var(--color-mist)' : active ? 'rgba(232, 242, 251, 0.5)' : 'transparent',
        transform: isOver ? 'scale(1.04)' : 'scale(1)',
      }}
    >
      <Droplets size={22} style={{ color: isOver ? 'var(--color-blue)' : 'var(--color-ink-soft)' }} className={isOver ? 'gentle-pulse' : ''} />
      <span className="text-xs font-medium" style={{ color: isOver ? 'var(--color-blue)' : 'var(--color-ink-soft)' }}>
        {isOver ? 'Release to send to laundry' : 'Drag outfit here for laundry'}
      </span>
    </div>
  )
}
