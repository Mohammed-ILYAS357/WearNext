import { useMemo, useState } from 'react'
import { Palette } from 'lucide-react'
import { generateColorPalette, hexToRgb, rgbToHex } from '../utils/color'

export default function ColorPicker({ color, onChange }) {
  const palette = useMemo(() => generateColorPalette(), [])
  const [hexInput, setHexInput] = useState(color.hex)

  function setHex(hex) {
    if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return
    onChange({ rgb: hexToRgb(hex), hex })
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 shadow-sm"
          style={{ background: color.hex, borderColor: 'white', boxShadow: '0 0 0 1px var(--color-mist-2)' }}
        />
        <div className="flex flex-1 items-center gap-2">
          <input
            type="text"
            value={hexInput}
            onChange={(e) => {
              setHexInput(e.target.value)
              if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) setHex(e.target.value)
            }}
            onBlur={() => setHexInput(color.hex)}
            className="w-24 rounded-xl border px-2.5 py-2 font-mono text-xs uppercase outline-none"
            style={{ borderColor: 'var(--color-mist-2)' }}
            maxLength={7}
          />
          <label
            className="relative flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium"
            style={{ background: 'var(--color-mist)', color: 'var(--color-blue-deep)' }}
          >
            <Palette size={13} />
            Custom
            <input
              type="color"
              value={color.hex}
              onChange={(e) => { setHex(e.target.value); setHexInput(e.target.value) }}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-8 gap-2">
        {palette.map((hex) => (
          <button
            key={hex}
            type="button"
            onClick={() => { setHex(hex); setHexInput(hex) }}
            className="aspect-square rounded-lg transition-transform active:scale-90"
            style={{
              background: hex,
              boxShadow: color.hex.toLowerCase() === hex.toLowerCase()
                ? '0 0 0 2px white, 0 0 0 4px var(--color-blue)'
                : '0 0 0 1px rgba(11,37,69,0.08)',
            }}
            aria-label={`Choose ${hex}`}
          />
        ))}
      </div>
    </div>
  )
}
