import { useState } from 'react'
import {
  Smartphone, Sun, Calendar, Info, ArrowLeftRight,
  ChevronDown, ChevronUp, Droplets, Layers, Mail,
} from 'lucide-react'

// Inline SVG icons for Android/iOS (not in this lucide-react version)
function AndroidIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 18c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h1c.55 0 1-.45 1-1V8H6v10zm-2.5-10C2.67 8 2 8.67 2 9.5v7c0 .83.67 1.5 1.5 1.5S5 17.33 5 16.5v-7C5 8.67 4.33 8 3.5 8zm17 0c-.83 0-1.5.67-1.5 1.5v7c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-7c0-.83-.67-1.5-1.5-1.5zm-4.97-5.84l1.3-1.3c.2-.2.2-.51 0-.71-.2-.2-.51-.2-.71 0l-1.48 1.48A5.84 5.84 0 0 0 12 1c-.96 0-1.86.23-2.66.63L7.85.15c-.2-.2-.51-.2-.71 0-.2.2-.2.51 0 .71l1.31 1.31A5.983 5.983 0 0 0 6 7h12a5.983 5.983 0 0 0-2.47-4.84zM10 5H9V4h1v1zm5 0h-1V4h1v1z" />
    </svg>
  )
}

function AppleIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  )
}

// ─── Primitives ───────────────────────────────────────────────────────────────

function Accordion({ icon: Icon, title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div
      className="overflow-hidden rounded-2xl transition-shadow"
      style={{
        border: '1px solid var(--color-mist-2)',
        boxShadow: open ? '0 2px 12px rgba(11,37,69,0.06)' : 'none',
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
        style={{ background: open ? 'var(--color-mist)' : 'white' }}
      >
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
          style={{ background: open ? 'var(--color-blue)' : 'var(--color-mist-2)' }}
        >
          <Icon size={14} color={open ? 'white' : 'var(--color-blue)'} strokeWidth={2} />
        </span>
        <span className="flex-1 text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>{title}</span>
        {open
          ? <ChevronUp size={14} style={{ color: 'var(--color-ink-soft)', flexShrink: 0 }} />
          : <ChevronDown size={14} style={{ color: 'var(--color-ink-soft)', flexShrink: 0 }} />}
      </button>
      {open && (
        <div className="space-y-3 px-4 pb-5 pt-3" style={{ background: 'white' }}>
          {children}
        </div>
      )}
    </div>
  )
}

function Step({ n, children }) {
  return (
    <div className="flex items-start gap-3">
      <span
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
        style={{ background: 'var(--color-blue)' }}
      >
        {n}
      </span>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>{children}</p>
    </div>
  )
}

function Tip({ children }) {
  return (
    <p
      className="rounded-xl px-3 py-2.5 text-xs leading-relaxed"
      style={{ background: 'var(--color-mist)', color: 'var(--color-ink-soft)' }}
    >
      {children}
    </p>
  )
}

function PlatformTab({ label, icon: Icon, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-colors"
      style={{
        background: active ? 'var(--color-blue)' : 'transparent',
        color: active ? 'white' : 'var(--color-ink-soft)',
      }}
    >
      <Icon size={13} />
      {label}
    </button>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AboutSection() {
  const [platform, setPlatform] = useState('android') // 'android' | 'ios'

  return (
    <section className="mx-auto w-full max-w-sm px-6 pb-2">

      {/* Section heading */}
      <div className="mb-4 mt-8 flex items-center gap-3">
        <div className="h-px flex-1" style={{ background: 'var(--color-mist-2)' }} />
        <span className="font-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-ink-soft)' }}>
          About &amp; Help
        </span>
        <div className="h-px flex-1" style={{ background: 'var(--color-mist-2)' }} />
      </div>

      <div className="flex flex-col gap-2.5">

        {/* ── Install as an App ── */}
        <Accordion icon={Smartphone} title="Install as an App">
          <div
            className="mb-3 flex rounded-xl p-1"
            style={{ background: 'var(--color-mist)' }}
          >
            <PlatformTab label="Android" icon={AndroidIcon} active={platform === 'android'} onClick={() => setPlatform('android')} />
            <PlatformTab label="iPhone" icon={AppleIcon} active={platform === 'ios'} onClick={() => setPlatform('ios')} />
          </div>

          {platform === 'android' ? (
            <div className="space-y-2.5">
              <Step n={1}>Open WearNext in <strong>Chrome</strong> browser on your Android.</Step>
              <Step n={2}>Tap the <strong>⋮ three-dot menu</strong> at the top right.</Step>
              <Step n={3}>Tap <strong>"Add to Home Screen"</strong>.</Step>
              <Step n={4}>Tap <strong>"Install"</strong> in the pop-up. Done!</Step>
              <Tip>💡 The app icon now lives on your home screen and works completely offline — no internet needed after the first load.</Tip>
            </div>
          ) : (
            <div className="space-y-2.5">
              <Step n={1}>Open WearNext in <strong>Safari</strong> on your iPhone.</Step>
              <Step n={2}>Tap the <strong>Share button (□↑)</strong> at the bottom of Safari.</Step>
              <Step n={3}>Scroll down and tap <strong>"Add to Home Screen"</strong>.</Step>
              <Step n={4}>Tap <strong>"Add"</strong> at the top right. Done!</Step>
              <Tip>💡 Must be Safari — Chrome on iOS doesn't support PWA installation. Once added, it works fully offline.</Tip>
            </div>
          )}
        </Accordion>

        {/* ── How WearNext Works ── */}
        <Accordion icon={Sun} title="How WearNext works">
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-blue)' }}>The idea</p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>
                Add your outfits once. Every morning WearNext picks one for you — no decisions, no repeats.
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-blue)' }}>Day-by-day</p>
              <Step n={1}>At <strong>6:00 AM</strong> a new "Dress of the Day" appears on the Home screen.</Step>
              <Step n={2}>Wear it, then <strong>drag the outfit card down</strong> to the laundry zone before bed.</Step>
              <Step n={3}>The app logs the wear and <strong>your next pick appears tomorrow at 6 AM</strong> — not before.</Step>
            </div>
            <Tip>🌙 Sent it to laundry at night? Home shows "All done for today" — that's intentional so you never see two outfits in the same day.</Tip>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-blue)' }}>Wardrobe list</p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>
                Scroll down on Home to see all your outfits with wear counts. Tap any row to <strong>edit the photo, name, notes or colour</strong>. Tap the bin icon to delete (asks confirmation first).
              </p>
            </div>
          </div>
        </Accordion>

        {/* ── Laundry ── */}
        <Accordion icon={Droplets} title="Laundry & reminders">
          <div className="space-y-3">
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>
              Dragging an outfit to the laundry zone on Home (or the Calendar detail) starts a wash cycle — by default <strong>2 days</strong>, adjustable in Laundry → Settings (⚙ icon).
            </p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>
              The <strong>water-glass gauge</strong> on the Laundry tab fills calmly as more items go in — it never turns red or alarming no matter how full. Tap "Done" when an outfit is dry and it rejoins the queue at the back.
            </p>
            <Tip>🔔 Enable notifications in Laundry → Settings to get a morning "Dress of the Day" reminder and a <strong>10 PM nudge</strong> to put your outfit in the wash before bed.</Tip>
          </div>
        </Accordion>

        {/* ── Calendar ── */}
        <Accordion icon={Calendar} title="Calendar — past, today & upcoming">
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-blue)' }}>Colour coding</p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>
                Each calendar tile is coloured by that day's outfit. <strong>Full opacity = confirmed worn</strong>. <strong>Faded with a dot = inferred</strong> (see below).
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-blue)' }}>Upcoming days</p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>
                Future coloured tiles show your planned outfit queue in order. A small <strong>★ star</strong> marks the outfit you've worn least — consider moving it sooner so your wardrobe stays balanced.
              </p>
            </div>
          </div>
        </Accordion>

        {/* ── Swapping ── */}
        <Accordion icon={ArrowLeftRight} title="How to swap outfits in the calendar">
          <div className="space-y-3">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-blue)' }}>Same month — drag</p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>
                Press and hold a future coloured tile, then drag it onto another future tile. Release — they swap instantly.
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-blue)' }}>Across months — tap to swap</p>
              <Step n={1}>Tap any future day tile to open its detail sheet.</Step>
              <Step n={2}>Tap <strong>"Swap with another day"</strong> — a blue banner appears.</Step>
              <Step n={3}>Navigate to any other month (forward or back) freely.</Step>
              <Step n={4}>Tap any coloured future day — they swap. Tap Cancel to exit.</Step>
            </div>
            <Tip>ℹ️ Only future days are swappable. Today and past history are fixed.</Tip>
          </div>
        </Accordion>

        {/* ── What is Inferred ── */}
        <Accordion icon={Info} title='What does "Inferred" mean?'>
          <div className="space-y-3">
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>
              When you wear an outfit for multiple days in a row, or forget to send it to laundry, those days have no recorded entry in the calendar.
            </p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>
              Instead of showing blank tiles, WearNext fills those days with the <strong>most recently confirmed outfit</strong> shown at half opacity with a small dot at the bottom of the tile.
            </p>
            <Tip>📌 Inferred tiles are read-only — they're the app's best guess, not a confirmed log. Only tiles at full opacity are actual wear records.</Tip>
          </div>
        </Accordion>

        {/* ── Add Outfit tips ── */}
        <Accordion icon={Layers} title="Adding &amp; editing outfits">
          <div className="space-y-3">
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>
              Tap <strong>Add (+)</strong> in the navigation. Choose <strong>Gallery</strong> to pick from your photo library (works on Android and iPhone), or <strong>Take a photo now</strong> to use the camera directly.
            </p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>
              The dominant colour is auto-detected from your photo and used for the calendar tiles. You can always change it manually with the full colour picker — palette grid, custom colour wheel, or type a hex code.
            </p>
            <Tip>✏️ To edit an outfit later, scroll to "Your Wardrobe" on Home and tap any outfit row. You can update the photo, name, notes and colour anytime.</Tip>
          </div>
        </Accordion>

      </div>

      {/* ── Copyright footer ── */}
      <div className="mt-8 pb-6 text-center">
        <div className="mb-4 h-px w-full" style={{ background: 'var(--color-mist-2)' }} />
        <p className="font-display text-base italic" style={{ color: 'var(--color-blue)' }}>
          Wake Up. Wear Next. Go.
        </p>
        <p className="mt-1 font-mono text-[11px]" style={{ color: 'var(--color-ink-soft)' }}>
          MVP 1.0
        </p>
        <p className="mt-3 text-[12px] font-medium" style={{ color: 'var(--color-ink)' }}>
          © 2026 Mohammed Ilyas M
        </p>
        <a
          href="mailto:mohammedilyas@gmail.com"
          className="mt-1 inline-flex items-center gap-1.5 text-[11px] transition-opacity hover:opacity-70"
          style={{ color: 'var(--color-ink-soft)' }}
        >
          <Mail size={11} />
          mohammedilyas@gmail.com
        </a>
        <p className="mt-4 text-[10px] leading-relaxed" style={{ color: 'var(--color-mist-2)' }}>
          Built offline-first. No account. No ads. No tracking.
          Your wardrobe stays on your device, always.
        </p>
      </div>

    </section>
  )
}
