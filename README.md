# WearNext

**Wake Up. Wear Next. Go.**

A premium, offline-first Progressive Web App that removes morning decision
fatigue. Open the app, see today's outfit full-screen, wear it, leave. That's
the whole product.

---

## Quick start

```bash
npm install
npm run dev       # local dev server at http://localhost:5173
npm run build     # production build → dist/ (fully offline PWA)
npm run preview   # serve the production build locally
```

To install it as an app on your phone: open the built site in a mobile
browser, then "Add to Home Screen" (iOS Safari) or use the install prompt
(Android Chrome). Once installed, it never needs the network again.

**Nothing is sent anywhere.** There is no backend, no account, no analytics.
Every outfit, photo, and date lives only in your browser's IndexedDB.

---

## Project structure

```
wearnext/
├── public/
│   └── icons/                 # generated app icons + favicon
├── src/
│   ├── main.jsx                # entry point
│   ├── App.jsx                 # router + layout shell
│   ├── index.css                # design tokens (Tailwind v4 @theme) + global styles
│   ├── db/
│   │   └── db.js                # IndexedDB wrapper (outfits, history, meta/settings)
│   ├── context/
│   │   └── AppContext.jsx       # rotation queue logic, day rollover, laundry timing,
│   │                             # notification scheduling — the app's "brain"
│   ├── utils/
│   │   └── color.js             # dominant-color extraction + image compression
│   ├── components/
│   │   ├── Navigation.jsx       # bottom tab bar
│   │   ├── ReminderBanner.jsx   # gentle, dismissible laundry nudge
│   │   ├── LaundryGlass.jsx     # the signature animated water-fill gauge
│   │   └── LaundryDropZone.jsx  # dnd-kit droppable target
│   └── pages/
│       ├── Home.jsx             # Dress of the Day (full-screen, drag-to-laundry)
│       ├── AddClothes.jsx       # photo/text entry + auto color extraction
│       ├── Calendar.jsx         # monthly history, colored by dominant color
│       └── Laundry.jsx          # laundry queue + settings
├── vite.config.js               # Vite + Tailwind v4 + PWA (service worker) plugin
└── index.html
```

---

## How the rotation system works

Outfits live in one of two states: `queue` (available to wear) or `laundry`.
A single ordered list (`rotationQueue`, an array of outfit ids) determines
wear order for **future** days — front of the queue is worn next. The outfit
currently revealed as today's pick is *not* part of this list (it's tracked
separately as `todayOutfitId`), which matters for the Calendar's future
scheduling below.

- **WearNext's day starts at 6:00 AM, not midnight.** Sending an outfit to
  laundry at 9 PM shouldn't make a new one appear at 12:01 AM while you're
  still awake in the same outfit. Everything below is keyed off this "app-day"
  boundary rather than the calendar date.
- **Each new app-day (i.e. each time the clock crosses 6:00 AM)**, the app
  looks at the front of the queue and that becomes the new "Dress of the
  Day." This is checked on load and again every time the tab regains focus.
- **Dragging today's outfit to the laundry zone** immediately clears it from
  today's slot, logs it to wear history, and marks it `laundry` with a due
  date — but **does not** pull in a replacement. Home shows an "All done for
  today" state instead, and the next pick only appears at the next 6:00 AM
  boundary. This was a specific, deliberate request: seeing two different
  "dresses of the day" in the same day defeats the point of the feature.
- **If you forget** to drag it to laundry before the boundary, the app
  doesn't block or scold you — it quietly logs it as worn and auto-advances
  it into the wash anyway, so tomorrow isn't stuck repeating today's outfit.
- **"Done" in Laundry** returns the outfit to the queue. If nothing else was
  available at all (every outfit was in the wash), it's revealed on Home
  immediately — no reason to make you wait when there was nothing to wait
  behind. If other outfits were already available, it just rejoins the queue
  normally and waits its turn.

## Calendar: future scheduling and swaps

Every date's outfit comes from one of two sources depending on whether it's
in the past or the future relative to the current app-day:

- **Past dates** read from a permanent wear-history log — this never changes
  once written, so your record of what you actually wore stays intact.
- **Today and future dates** are *computed*, not stored: day offset `+1` maps
  to `rotationQueue[0]`, `+2` to `rotationQueue[1]`, and so on. This is what
  makes future days show real, distinct upcoming outfits instead of a blank
  calendar, and it's also what makes rearranging them trivial — **dragging
  one future day tile onto another simply swaps their positions in the
  queue**. A small star marks whichever upcoming outfit has been worn the
  least, as a gentle nudge that it might be worth moving sooner.

## Color — extraction fix + full manual picker

The original dominant-color extraction relied on a third-party library
(`colorthief`) that, in practice, kept returning the same fallback blue
regardless of the photo. It's been replaced with a small self-contained
canvas quantizer (`utils/color.js`): the photo is downsampled, every pixel is
bucketed into a coarse RGB grid with near-white/near-black/flat backdrop
pixels down-weighted, and the most common bucket's true average color wins.
This was verified against multiple distinctly-colored test photos during
development and correctly returns the actual garment color each time.

On top of that, **both** Add Clothes modes (photo upload and text-only) now
share a full `ColorPicker` component: a broad hue-sweep palette grid, a
native OS color wheel ("Custom"), and a hex text field — so you're never
stuck with just the auto-detected color or a handful of presets.

## Home page: wardrobe visibility

Home now always shows a `WardrobeSummary` beneath the Dress of the Day (or
beneath the "waiting" / "everything's in the wash" states): total outfit
count, how many are fresh, how many are in laundry, and a full list of every
outfit with its wear count and a tap-to-confirm delete button. This is the
one place to answer "how many outfits do I actually have" and "which ones
have I barely worn," which the original build had no way to show.

## The laundry gauge — deliberately never "angry"

`LaundryGlass.jsx` is the app's one signature visual: a glass jar that fills
with water as more outfits enter the wash. By design, it **never turns red,
orange, or shows urgency cues** — filling further only deepens the blue and
adds a second, slower wave layer for a sense of real liquid. The intent from
the brief was explicit: laundry should never feel like a chore you're being
punished for. The *text* next to the gauge does the informing ("3 days
remaining," "ready whenever you are"); the *gauge* stays calm regardless of
how full it gets.

## Notifications — free, on-device, no server

The "Dress of the Day" 7:30 AM reminder uses the browser's native
`Notification` API, scheduled entirely client-side with no push server. This
means it's genuinely free (no infrastructure cost) and keeps the app
100% offline, but it comes with one real trade-off worth knowing about:
**browser/OS notification scheduling generally requires the app or its
service worker to be active around the trigger time** — it's reliable if
the phone has the app installed and isn't force-closed, but isn't as
guaranteed as a server-sent push notification. To make sure the reminder
never truly gets missed, there's always a fallback: opening the app shows
the "Dress of the Day" full-screen immediately regardless of whether the
push fired, and the in-app laundry reminder banner persists across sessions
until you deal with it.

## Tech stack

- **React 19 + Vite** — app shell and dev/build tooling
- **Tailwind CSS v4** (`@theme` tokens) — design system: palette, type, motion
- **React Router (HashRouter)** — client-side routing that works from a
  single static `index.html` with zero server config, which offline PWAs need
- **@dnd-kit** — drag-to-laundry and drag-to-swap interactions, pointer + touch sensors
- **idb** (IndexedDB) — offline storage. Chosen over `localStorage` (which
  the original brief's tech list mentioned) because outfit photos as data
  URLs can be a few hundred KB each; `localStorage`'s ~5MB ceiling fills up
  fast, while IndexedDB comfortably holds a full wardrobe of photos offline.
- **vite-plugin-pwa** (Workbox) — generates the service worker that precaches
  the entire app shell, so after the first visit, everything works with the
  network fully off (verified in testing: reload with `offline: true` still
  renders the full app)
- **lucide-react** — icon set

## Design system

- **Palette:** Canvas `#FBFCFE` (near-white), Mist `#E8F2FB` (pale blue
  surfaces), Ink `#0B2545` (deep navy text), Sky `#6FB7E8`, Blue `#1D5FA8`
  (primary), Water `#4FA8D8` → `#A8D8F0` (laundry gauge gradient family)
- **Type:** Fraunces (display serif, used sparingly for outfit names and
  page titles — the one moment of editorial warmth), Inter (UI/body), IBM
  Plex Mono (dates, timestamps, small data labels)
- **Signature element:** the animated glass laundry gauge (see above)

## Future enhancements (noted in the original brief, not built in this MVP)

AI outfit recognition, weather-aware recommendations, exam/lab mode, wear
statistics, ironing/repair status, hostel travel mode.
