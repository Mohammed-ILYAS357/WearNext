import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, ImageIcon, Type, Check, Loader2, X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { extractDominantColor, fileToCompressedDataUrl } from '../utils/color'
import ColorPicker from '../components/ColorPicker'

export default function AddClothes() {
  const { createOutfit } = useApp()
  const navigate = useNavigate()

  // Two separate inputs:
  // 1. galleryInputRef — no `capture` attribute → Android/iOS shows the full
  //    photo library / file picker. This is what "Upload from gallery" uses.
  //    The `capture` attribute is intentionally absent: setting it to any value
  //    on Android forces the camera to open instead of the picker, which is
  //    exactly the bug we're fixing.
  // 2. cameraInputRef — `capture="environment"` → opens the rear camera
  //    directly, for users who want to photograph a garment right now.
  const galleryInputRef = useRef(null)
  const cameraInputRef = useRef(null)

  const [mode, setMode] = useState('photo') // 'photo' | 'text'
  const [image, setImage] = useState(null)
  const [color, setColor] = useState({ rgb: [111, 183, 232], hex: '#6FB7E8' })
  const [colorTouched, setColorTouched] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('Casual')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    // Reset the input value so picking the same file twice still fires onChange
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

  function clearImage() {
    setImage(null)
    setColorTouched(false)
    setColor({ rgb: [111, 183, 232], hex: '#6FB7E8' })
  }

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    try {
      await createOutfit({
        name: name.trim(),
        category,
        notes: notes.trim(),
        image: mode === 'photo' ? image : null,
        color: color.rgb,
        hex: color.hex,
      })
      navigate('/')
    } finally {
      setSaving(false)
    }
  }

  const canSave = name.trim().length > 0 && !extracting && !saving && (mode === 'text' || image)

  return (
    <div className="min-h-screen px-6 pb-28 pt-8">
      {/* Hidden inputs — separated so `capture` only applies to the camera one */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />

      <header className="mb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em]" style={{ color: 'var(--color-ink-soft)' }}>New piece</p>
        <h1 className="font-display text-3xl" style={{ color: 'var(--color-ink)' }}>Add to your wardrobe</h1>
      </header>

      {/* Mode toggle */}
      <div className="mb-5 flex rounded-2xl p-1" style={{ background: 'var(--color-mist)' }}>
        {[
          { key: 'photo', label: 'Photo', icon: ImageIcon },
          { key: 'text', label: 'Text only', icon: Type },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-medium transition-colors"
            style={{
              background: mode === key ? 'white' : 'transparent',
              color: mode === key ? 'var(--color-blue)' : 'var(--color-ink-soft)',
              boxShadow: mode === key ? '0 1px 4px rgba(11,37,69,0.08)' : 'none',
            }}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {mode === 'photo' && (
        <div className="mb-6">
          {!image ? (
            <div className="flex flex-col gap-3">
              {/* Gallery — no `capture`, shows full photo library on Android */}
              <button
                onClick={() => galleryInputRef.current?.click()}
                className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed"
                style={{ borderColor: 'var(--color-blue)', background: 'var(--color-mist)' }}
              >
                <ImageIcon size={30} style={{ color: 'var(--color-blue)' }} />
                <span className="text-sm font-semibold" style={{ color: 'var(--color-blue)' }}>
                  Choose from gallery
                </span>
                <span className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>
                  Picks from your photo library
                </span>
              </button>

              {/* Camera — forces direct camera capture */}
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="flex h-24 w-full flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed"
                style={{ borderColor: 'var(--color-mist-2)', background: 'white' }}
              >
                <Camera size={22} style={{ color: 'var(--color-ink-soft)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--color-ink-soft)' }}>
                  Take a photo now
                </span>
              </button>
            </div>
          ) : (
            <div className="relative">
              <img
                src={image}
                alt="Uploaded outfit"
                className="h-72 w-full rounded-3xl object-cover shadow-lg"
              />
              <div className="absolute right-3 top-3 flex gap-2">
                <button
                  onClick={() => galleryInputRef.current?.click()}
                  className="rounded-full px-3 py-1.5 text-xs font-semibold backdrop-blur-md"
                  style={{ background: 'rgba(11,37,69,0.55)', color: '#F7FBFF' }}
                >
                  Change
                </button>
                <button
                  onClick={clearImage}
                  className="rounded-full p-1.5 backdrop-blur-md"
                  style={{ background: 'rgba(11,37,69,0.55)' }}
                  aria-label="Remove photo"
                >
                  <X size={16} color="white" />
                </button>
              </div>
              {extracting && (
                <div
                  className="absolute inset-0 flex items-center justify-center rounded-3xl backdrop-blur-sm"
                  style={{ background: 'rgba(11,37,69,0.25)' }}
                >
                  <Loader2 className="animate-spin" color="white" />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Color — auto-extracted from photo (editable), or fully manual for text-only */}
      <div className="mb-6">
        <label
          className="mb-2 block text-xs font-semibold uppercase tracking-wide"
          style={{ color: 'var(--color-ink-soft)' }}
        >
          {mode === 'photo' && image ? 'Color (auto-detected — tap to change)' : 'Pick a color'}
        </label>
        <ColorPicker
          color={color}
          onChange={(c) => { setColor(c); setColorTouched(true) }}
        />
      </div>

      {/* Name */}
      <div className="mb-5">
        <label
          className="mb-2 block text-xs font-semibold uppercase tracking-wide"
          style={{ color: 'var(--color-ink-soft)' }}
        >
          Outfit name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Navy Blazer & White Tee"
          className="w-full rounded-2xl border px-4 py-3 text-sm outline-none"
          style={{ borderColor: 'var(--color-mist-2)', background: 'white' }}
        />
      </div>

      {/* Category */}
      <div className="mb-5">
        <label
          className="mb-2 block text-xs font-semibold uppercase tracking-wide"
          style={{ color: 'var(--color-ink-soft)' }}
        >
          Category
        </label>
        <div className="flex gap-2">
          {['Casual', 'Formal'].map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className="flex-1 rounded-2xl py-2.5 text-sm font-medium transition-colors"
              style={{
                background: category === c ? 'var(--color-blue)' : 'var(--color-mist)',
                color: category === c ? 'white' : 'var(--color-ink-soft)',
              }}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="mb-8">
        <label
          className="mb-2 block text-xs font-semibold uppercase tracking-wide"
          style={{ color: 'var(--color-ink-soft)' }}
        >
          Notes <span className="normal-case font-normal">(optional)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any styling notes, occasion, or reminders…"
          rows={3}
          className="w-full resize-none rounded-2xl border px-4 py-3 text-sm outline-none"
          style={{ borderColor: 'var(--color-mist-2)', background: 'white' }}
        />
      </div>

      <button
        onClick={handleSave}
        disabled={!canSave}
        className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-semibold text-white shadow-lg transition-opacity disabled:opacity-40"
        style={{ background: 'var(--color-blue)' }}
      >
        {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
        Add to wardrobe
      </button>
    </div>
  )
}
