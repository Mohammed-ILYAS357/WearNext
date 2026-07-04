import { useState } from 'react'
import { Trash2, Shirt, Droplets, Layers } from 'lucide-react'
import { useApp } from '../context/AppContext'

function StatChip({ icon: Icon, label, value }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1 rounded-2xl py-3" style={{ background: 'var(--color-mist)' }}>
      <Icon size={16} style={{ color: 'var(--color-blue)' }} />
      <span className="font-display text-xl" style={{ color: 'var(--color-ink)' }}>{value}</span>
      <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--color-ink-soft)' }}>{label}</span>
    </div>
  )
}

export default function WardrobeSummary() {
  const { outfits, laundryOutfits, meta, removeOutfit } = useApp()
  const [confirmId, setConfirmId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const total = outfits.length
  const inLaundry = laundryOutfits.length
  const fresh = total - inLaundry

  if (total === 0) return null

  async function confirmDelete(id) {
    setDeletingId(id)
    await removeOutfit(id)
    setConfirmId(null)
    setDeletingId(null)
  }

  const sorted = [...outfits].sort((a, b) => {
    if (a.id === meta?.todayOutfitId) return -1
    if (b.id === meta?.todayOutfitId) return 1
    return (b.wearCount || 0) - (a.wearCount || 0)
  })

  return (
    <section className="mx-auto w-full max-w-sm px-6">
      <div className="flex gap-2">
        <StatChip icon={Layers} label="Total" value={total} />
        <StatChip icon={Shirt} label="Fresh" value={fresh} />
        <StatChip icon={Droplets} label="Laundry" value={inLaundry} />
      </div>

      <h3 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-ink-soft)' }}>
        Your wardrobe
      </h3>
      <ul className="flex flex-col gap-2 pb-4">
        {sorted.map((o) => {
          const isConfirming = confirmId === o.id
          return (
            <li key={o.id} className="overflow-hidden rounded-2xl" style={{ background: 'white', border: '1px solid var(--color-mist-2)' }}>
              {isConfirming ? (
                <div className="flex items-center gap-2 p-2.5">
                  <p className="flex-1 text-xs font-medium" style={{ color: 'var(--color-ink)' }}>
                    Delete <span className="font-semibold">{o.name}</span>? This can't be undone.
                  </p>
                  <button
                    onClick={() => setConfirmId(null)}
                    className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold"
                    style={{ background: 'var(--color-mist)', color: 'var(--color-ink-soft)' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => confirmDelete(o.id)}
                    disabled={deletingId === o.id}
                    className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                    style={{ background: '#B3261E' }}
                  >
                    {deletingId === o.id ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-2.5">
                  {o.image ? (
                    <img src={o.image} alt={o.name} className="h-11 w-11 shrink-0 rounded-xl object-cover" />
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ background: o.hex }}>
                      <Shirt size={16} color="white" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>{o.name}</p>
                    <p className="text-[11px]" style={{ color: 'var(--color-ink-soft)' }}>
                      {o.id === meta?.todayOutfitId ? "Today's pick · " : ''}
                      {o.status === 'laundry' ? 'In laundry · ' : ''}
                      worn {o.wearCount || 0}×
                    </p>
                  </div>
                  <button
                    onClick={() => setConfirmId(o.id)}
                    className="shrink-0 rounded-full p-2 transition-colors"
                    style={{ background: 'var(--color-mist)', color: 'var(--color-ink-soft)' }}
                    aria-label={`Delete ${o.name}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
