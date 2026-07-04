export function rgbToHex([r, g, b]) {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

export function hexToRgb(hex) {
  const clean = hex.replace('#', '')
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ]
}

export function relativeLuminance([r, g, b]) {
  const [rs, gs, bs] = [r, g, b].map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

/** Picks readable text (near-white or near-navy) for a given background color. */
export function readableTextOn(rgb) {
  return relativeLuminance(rgb) > 0.5 ? '#0B2545' : '#F7FBFF'
}

/**
 * Extracts the dominant color from an uploaded image.
 *
 * This is a self-contained canvas quantizer rather than a third-party
 * library: the image is downsampled onto a small canvas, every pixel is
 * bucketed into a coarse RGB grid, near-white/near-black/near-gray pixels
 * (background, shadows) are down-weighted so a garment's actual color wins
 * over the backdrop, and the most common bucket's true average is returned.
 * Resolves to { rgb: [r,g,b], hex } or null on failure (e.g. text-only entries).
 */
export function extractDominantColor(dataUrl) {
  return new Promise((resolve) => {
    if (!dataUrl) {
      resolve(null)
      return
    }
    const img = new Image()
    img.onload = () => {
      try {
        const SIZE = 120
        const canvas = document.createElement('canvas')
        canvas.width = SIZE
        canvas.height = SIZE
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        // Cover-fit so we sample the whole frame, not a stretched version.
        const scale = Math.max(SIZE / img.naturalWidth, SIZE / img.naturalHeight)
        const w = img.naturalWidth * scale
        const h = img.naturalHeight * scale
        ctx.drawImage(img, (SIZE - w) / 2, (SIZE - h) / 2, w, h)

        const { data } = ctx.getImageData(0, 0, SIZE, SIZE)
        const BUCKET = 24 // quantization step per channel
        const buckets = new Map()

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3]
          if (a < 128) continue

          const max = Math.max(r, g, b)
          const min = Math.min(r, g, b)
          const isNearWhite = min > 235
          const isNearBlack = max < 20
          const isLowSaturation = (max - min) < 12 && max > 235 // flat white backdrop
          if (isNearWhite || isNearBlack || isLowSaturation) continue

          const key = `${Math.round(r / BUCKET)}-${Math.round(g / BUCKET)}-${Math.round(b / BUCKET)}`
          const entry = buckets.get(key)
          if (entry) {
            entry.count++
            entry.r += r; entry.g += g; entry.b += b
          } else {
            buckets.set(key, { count: 1, r, g, b })
          }
        }

        let best = null
        for (const entry of buckets.values()) {
          if (!best || entry.count > best.count) best = entry
        }

        if (!best) {
          // Whole image was background-like (e.g. a plain white product shot);
          // fall back to the true average of every pixel instead.
          let r = 0, g = 0, b = 0, n = 0
          for (let i = 0; i < data.length; i += 4) {
            r += data[i]; g += data[i + 1]; b += data[i + 2]; n++
          }
          const rgb = [Math.round(r / n), Math.round(g / n), Math.round(b / n)]
          resolve({ rgb, hex: rgbToHex(rgb) })
          return
        }

        const rgb = [
          Math.round(best.r / best.count),
          Math.round(best.g / best.count),
          Math.round(best.b / best.count),
        ]
        resolve({ rgb, hex: rgbToHex(rgb) })
      } catch (e) {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = dataUrl
  })
}

/** A broad, evenly-distributed palette for the manual color picker (hue sweep + neutrals). */
export function generateColorPalette() {
  const colors = []
  const hues = [0, 20, 35, 50, 70, 100, 140, 170, 190, 210, 230, 255, 275, 300, 325, 345]
  for (const h of hues) {
    colors.push(hslToHex(h, 70, 55))
    colors.push(hslToHex(h, 55, 40))
  }
  const neutrals = ['#FFFFFF', '#E5E7EB', '#9CA3AF', '#4B5563', '#1F2937', '#000000', '#F5E6D3', '#8B5E3C']
  return [...colors, ...neutrals]
}

function hslToHex(h, s, l) {
  s /= 100; l /= 100
  const k = (n) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  const rgb = [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)]
  return rgbToHex(rgb)
}

/** Reads a File object into a compressed data URL, capping dimensions for storage efficiency. */
export function fileToCompressedDataUrl(file, maxDim = 1200, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        let { width, height } = img
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width)
            width = maxDim
          } else {
            width = Math.round((width * maxDim) / height)
            height = maxDim
          }
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.onerror = reject
      img.src = e.target.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
