import { useRef, useState, useEffect } from 'react'
import { X, Camera, ImageIcon, Check, Loader2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { extractDominantColor, fileToCompressedDataUrl } from '../utils/color'
import ColorPicker from './ColorPicker'

export default function EditOutfitSheet({ outfit, onClose }) {
  const { editOutfit } = useApp()
  const galleryRef = useRef(null)
  const cameraRef = useRef(null)

  const [image, setImage] = useState(outfit.image)
  const [name, setName] = useState(outfit.name)
  const [notes, setNotes] = useState(outfit.notes || '')
  const [category, setCategory] = useState(outfit.category || 'Casual')
  const [color, setColor] = useState({ rgb: outfit.color, hex: outfit.hex })
  const [colorTouched, setColorTouched] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [saving, setSaving] = useState(false)

  // Re-sync if the outfit prop changes (e.g. context refreshed)
  useEffect(() => {
    setImage(outfit.image)
    setName(outfit.name)
    setNotes(outfit.notes || '')
    setCategory(outfit.category || 'Casual')
    setColor({ rgb: outfit.color, hex: outfit.hex })
  }, [outfit.id])

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setExtracting(true)
    try {
      const dataUrl = await fileToCompressedDataUrl(file)
      setImage(dataUrl)
      if (!colorTouched) {
        const extracted = await extractDominantColor(dataUrl)
        if (extracted) setColor(extracted)
      }
    } finally {
      setExtracting(false)
    }
  }

  async function handleSave() {
    if (!name.trim() || saving) return
    setSaving(true)
    try {
      await editOutfit(outfit.id, {
        name: name.trim(),
        notes: notes.trim(),
        category,
        image,
        color: color.rgb,
        hex: color.hex,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50"
        style={{ background: 'rgba(11,37,69,0.45)' }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="animate-rise fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-md overflow-y-auto rounded-t-[2rem] px-6 pb-10 pt-5"
        style={{ background: 'var(--color-canvas)', maxHeight: '92dvh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hidden file inputs */}
        <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />

        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-widest" style={{ color: 'var(--color-ink-soft)' }}>Edit outfit</p>
            <h2 className="font-display text-xl" style={{ color: 'var(--color-ink)' }}>Update details</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2"
            style={{ background: 'var(--color-mist)' }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Photo */}
        <div className="mb-5">
          {image ? (
            <div className="relative">
              <img src={image} alt={name} className="h-52 w-full rounded-2xl object-cover shadow-md" />
              {extracting && (
                <div className="absolute inset-0 flex items-center justify-center rounded-2xl backdrop-blur-sm" style={{ background: 'rgba(11,37,69,0.25)' }}>
                  <Loader2 className="animate-spin" color="white" />
                </div>
              )}
              <div className="absolute right-2 top-2 flex gap-2">
                <button
                  onClick={() => galleryRef.current?.click()}
                  className="rounded-full px-3 py-1.5 text-xs font-semibold backdrop-blur-md"
                  style={{ background: 'rgba(11,37,69,0.55)', color: '#F7FBFF' }}
                >
                  <ImageIcon size={12} className="mr-1 inline" />Gallery
                </button>
                <button
                  onClick={() => cameraRef.current?.click()}
                  className="rounded-full px-3 py-1.5 text-xs font-semibold backdrop-blur-md"
                  style={{ background: 'rgba(11,37,69,0.55)', color: '#F7FBFF' }}
                >
                  <Camera size={12} className="mr-1 inline" />Camera
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => galleryRef.current?.click()}
                className="flex flex-1 flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed py-6"
                style={{ borderColor: 'var(--color-blue)', background: 'var(--color-mist)' }}
              >
                <ImageIcon size={22} style={{ color: 'var(--color-blue)' }} />
                <span className="text-xs font-semibold" style={{ color: 'var(--color-blue)' }}>Gallery</span>
              </button>
              <button
                onClick={() => cameraRef.current?.click()}
                className="flex flex-1 flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed py-6"
                style={{ borderColor: 'var(--color-mist-2)', background: 'white' }}
              >
                <Camera size={22} style={{ color: 'var(--color-ink-soft)' }} />
                <span className="text-xs font-medium" style={{ color: 'var(--color-ink-soft)' }}>Camera</span>
              </button>
            </div>
          )}
        </div>

        {/* Name */}
        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-ink-soft)' }}>Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-2xl border px-4 py-3 text-sm outline-none"
            style={{ borderColor: 'var(--color-mist-2)', background: 'white' }}
          />
        </div>

        {/* Notes / tagline */}
        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-ink-soft)' }}>Notes / tagline</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Occasion, styling notes, whatever helps…"
            className="w-full resize-none rounded-2xl border px-4 py-3 text-sm outline-none"
            style={{ borderColor: 'var(--color-mist-2)', background: 'white' }}
          />
        </div>

        {/* Category */}
        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-ink-soft)' }}>Category</label>
          <div className="flex gap-2">
            {['Casual', 'Formal'].map((c) => (
              <button key={c} onClick={() => setCategory(c)} className="flex-1 rounded-2xl py-2.5 text-sm font-medium"
                style={{ background: category === c ? 'var(--color-blue)' : 'var(--color-mist)', color: category === c ? 'white' : 'var(--color-ink-soft)' }}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Color */}
        <div className="mb-6">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-ink-soft)' }}>Color</label>
          <ColorPicker color={color} onChange={(c) => { setColor(c); setColorTouched(true) }} />
        </div>

        <button
          onClick={handleSave}
          disabled={!name.trim() || saving}
          className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-semibold text-white shadow-lg disabled:opacity-40"
          style={{ background: 'var(--color-blue)' }}
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
          Save changes
        </button>
      </div>
    </>
  )
}
