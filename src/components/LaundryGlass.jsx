// The single signature element of WearNext: a laundry jar that fills with
// water like a real glass container. It is intentionally never allowed to
// read as "alarming" — no red, no orange, no shake. As it fills, the water
// simply deepens from pale sky to a richer blue, and gets a slow second
// wave layered underneath for a sense of real liquid, not a scary meter.
export default function LaundryGlass({ percent = 0, size = 96, label }) {
  const clamped = Math.max(0, Math.min(100, percent))
  const waterHeight = (clamped / 100) * 62 // px inside the 0-72 fillable band
  const top = 78 - waterHeight

  // Deepen the blue as it fills, but never leave the blue family.
  const topColor = clamped < 50 ? '#BFE3FA' : '#8FCBEE'
  const bottomColor = clamped < 50 ? '#6FB7E8' : '#1D5FA8'

  return (
    <div className="flex flex-col items-center gap-2" role="img" aria-label={label || `Laundry ${Math.round(clamped)} percent full`}>
      <svg width={size} height={size} viewBox="0 0 96 96" fill="none">
        <defs>
          <clipPath id="glassClip">
            <path d="M28 14 H68 L64 82 A6 6 0 0 1 58 88 H38 A6 6 0 0 1 32 82 Z" />
          </clipPath>
          <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={topColor} />
            <stop offset="100%" stopColor={bottomColor} />
          </linearGradient>
        </defs>

        {/* glass outline */}
        <path
          d="M28 14 H68 L64 82 A6 6 0 0 1 58 88 H38 A6 6 0 0 1 32 82 Z"
          stroke="#1D5FA8"
          strokeWidth="2.5"
          fill="#F2F9FF"
        />
        {/* rim */}
        <rect x="25" y="10" width="46" height="6" rx="3" fill="#1D5FA8" />

        {/* water, clipped to glass shape */}
        <g clipPath="url(#glassClip)">
          <rect x="20" y={top} width="56" height="90" fill="url(#waterGrad)" className="water-wave" />
          {/* second translucent wave for depth */}
          <rect x="20" y={top + 4} width="56" height="90" fill={bottomColor} opacity="0.25" className="water-wave-slow" />
        </g>

        {/* glass highlight */}
        <path d="M34 20 L31 76" stroke="white" strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round" />
      </svg>
      {label && <span className="text-xs font-medium text-ink-soft" style={{ color: 'var(--color-ink-soft)' }}>{label}</span>}
    </div>
  )
}
