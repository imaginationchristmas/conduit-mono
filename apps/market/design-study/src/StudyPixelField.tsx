import { useEffect, useRef } from "react"
import type { MotionLevel } from "./settings"

/*
 * MarketQuest living pixel field (Phase 2.7, expanded).
 *
 * A coarse grid of chunky square "pixels" is drawn to a canvas 2D context, but
 * the field is never static — it behaves like a school of tiny sprites:
 *
 *   • Ambient drift — every cell breathes on a slow travelling wave, so the
 *     whole field gently undulates even with no pointer. This is the "alive"
 *     baseline that keeps MarketQuest feeling like a game, not a wallpaper.
 *   • Cursor comet — the pointer is a moving body with velocity. Cells inside
 *     its radius are shoved outward along the pointer's travel direction (not
 *     just radially), so a fast swipe parts the field like a comet and a slow
 *     hover only nudges. A short trail of recently-visited cells stays
 *     energized and colour-shifted, then cools back to the base.
 *   • Click ripple — a tap on empty background drops an expanding ring that
 *     shoves and ignites cells as its wavefront sweeps outward, then cools.
 *     Taps on buttons, controls, cards, or the entry panel are ignored, so the
 *     pulse only fires when the exposed pixels themselves are clicked.
 *   • Sparkles — a few cells at a time ignite into accent-coloured flares that
 *     scale up, glow, and die, like loot glinting in the grass. They spawn on
 *     a timer and near the pointer's path.
 *
 * Canvas 2D (not WebGL) is deliberate: the chunky per-cell loop is the look,
 * it needs no shaders or textures, and it stays inside the local-only content
 * policy. Colours are read live from the --field-* custom properties so the
 * field follows the active Oshi theme without a restart.
 *
 * Performance: the grid is coarse (CELL px cells) and the loop is O(cols*rows).
 * Ambient sparkles spawn on a timer, so the rAF stays alive even at rest; only
 * under `prefers-reduced-motion: reduce` does the field render once as a
 * static grid and never listen for the pointer.
 */

type RGB = [number, number, number]

const CELL = 9 // px per grid cell at 1x — small squares keep the pixel look
const GAP = 0.75 // px gap between cells (tight, near-contiguous)
const RADIUS = 180 // px influence radius around the pointer (at rest)
const PUSH = 38 // max px a cell is displaced at the centre (at full energy)
const EASE = 0.18 // per-frame ease toward the displaced position (fluid chase)
const SPEED_REF = 0.26 // px/ms that maps to "full" energy (a light flick)
const SPEED_SMOOTH = 0.35 // per-event smoothing; lower = reacts to flicks sooner
const RIPPLE_SPEED = 0.55 // px/ms the click wavefront expands
const RIPPLE_WIDTH = 90 // px thickness of the ripple band
const RIPPLE_PUSH = 34 // max px the ripple shoves cells at the wavefront
const RIPPLE_LIFE = 1100 // ms a ripple lives
const AMBIENT_AMP = 2.4 // px of ambient drift at the wave peak
const AMBIENT_FREQ = 0.16 // spatial frequency of the drift wave
const AMBIENT_SPEED = 0.00045 // temporal speed of the drift wave (per ms)
const TRAIL = 9 // number of recent pointer samples that stay energized
const SPARKLE_MAX = 14 // most sparkles alive at once
const SPARKLE_LIFE = 900 // ms a sparkle lives
const SPARKLE_EVERY = 240 // ms between sparkle spawns

// Fixed field tuning. These were previously exposed as live dock dials; the
// dialled values are now baked in as the defaults (the control was retired),
// so the field always renders with this feel:
//   POWER   — overall push/scale force
//   REACH   — how far the pointer's influence spreads (radius multiplier)
//   SNAP    — steepness of the speed → energy response
//   SPARKLE — ambient sparkle rate (1 = SPARKLE_EVERY)
const TUNE_POWER = 0.5
const TUNE_REACH = 1.3
const TUNE_SNAP = 0.9
const TUNE_SPARKLE = 1

function parseColor(value: string): RGB | null {
  const match = value.match(/#([0-9a-f]{6})/i)
  if (!match) return null
  const hex = match[1]
  return [
    parseInt(hex.slice(0, 2), 16),
    parseInt(hex.slice(2, 4), 16),
    parseInt(hex.slice(4, 6), 16),
  ]
}

function mix(a: RGB, b: RGB, t: number): string {
  const r = Math.round(a[0] + (b[0] - a[0]) * t)
  const g = Math.round(a[1] + (b[1] - a[1]) * t)
  const bl = Math.round(a[2] + (b[2] - a[2]) * t)
  return `rgb(${r},${g},${bl})`
}

// RGB-space blend that returns a colour (not a string), for chaining mixes.
function mix2(a: RGB, b: RGB, t: number): RGB {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ]
}

type Sparkle = {
  i: number // cell index
  born: number // ms timestamp
  accent: RGB
}

type Ripple = {
  x: number // origin px
  y: number
  born: number // ms timestamp
}

export function StudyPixelField({ motion = "full" }: { motion?: MotionLevel }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // The "Calm" setting forces the static field, layered on top of the OS
    // prefers-reduced-motion preference (locked decision 3).
    const reduced =
      motion === "reduced" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches

    // Fine cell spacing is the only density now; keep it as named constants
    // so the grid maths reads the same as when it was a setting.
    const cell = CELL
    const gap = GAP

    let width = 0
    let height = 0
    let cols = 0
    let rows = 0
    let dpr = 1

    // Per-cell state: current offset, scale, and colour mix (all eased).
    let ox: Float32Array = new Float32Array(0)
    let oy: Float32Array = new Float32Array(0)
    let sc: Float32Array = new Float32Array(0)
    let cm: Float32Array = new Float32Array(0)

    let base: RGB = [139, 131, 91] // Olive fallback
    let accents: RGB[] = [
      [154, 114, 170], // Purple
      [98, 198, 191], // Teal
      [241, 90, 48], // Orange
    ]

    // Pointer body + a short trail of recent positions that stay energized.
    let pointerX = -9999
    let pointerY = -9999
    let pointerVX = 0
    let pointerVY = 0
    let energy = 0 // smoothed 0..1 pointer speed, drives displacement intensity
    let pointerIn = false
    let lastMoveAt = 0
    const trail: { x: number; y: number; at: number }[] = []

    let sparkles: Sparkle[] = []
    let lastSparkleAt = 0
    let ripples: Ripple[] = []

    let raf = 0
    let running = false

    const readTheme = () => {
      const style = getComputedStyle(canvas)
      const nextBase = parseColor(style.getPropertyValue("--field-base"))
      const nextAccents = [
        parseColor(style.getPropertyValue("--field-accent-1")),
        parseColor(style.getPropertyValue("--field-accent-2")),
        parseColor(style.getPropertyValue("--field-accent-3")),
      ].filter((c): c is RGB => c !== null)
      if (nextBase) base = nextBase
      if (nextAccents.length > 0) accents = nextAccents
    }

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = rect.width
      height = rect.height
      canvas.width = Math.max(1, Math.round(width * dpr))
      canvas.height = Math.max(1, Math.round(height * dpr))
      cols = Math.ceil(width / cell) + 1
      rows = Math.ceil(height / cell) + 1
      const count = cols * rows
      ox = new Float32Array(count)
      oy = new Float32Array(count)
      sc = new Float32Array(count)
      cm = new Float32Array(count)
      sparkles = []
      readTheme()
      draw(performance.now())
    }

    const spawnSparkle = (now: number, nearX?: number, nearY?: number) => {
      if (sparkles.length >= SPARKLE_MAX || cols === 0) return
      let col: number
      let row: number
      if (nearX !== undefined && nearY !== undefined) {
        // Bias sparkles toward the pointer's neighbourhood so the comet
        // leaves a faint glittering wake.
        col = Math.round(nearX / cell + (Math.random() - 0.5) * 8)
        row = Math.round(nearY / cell + (Math.random() - 0.5) * 8)
      } else {
        col = Math.floor(Math.random() * cols)
        row = Math.floor(Math.random() * rows)
      }
      if (col < 0 || row < 0 || col >= cols || row >= rows) return
      const i = row * cols + col
      // Don't double-ignite a cell that's already sparkling.
      if (sparkles.some((s) => s.i === i)) return
      const accent = accents[Math.floor(Math.random() * accents.length)]
      sparkles.push({ i, born: now, accent })
    }

    const draw = (now: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, width, height)
      const size = cell - gap

      // Index sparkles by cell for O(1) lookup during the draw pass.
      const sparkleByCell = new Map<number, Sparkle>()
      for (const s of sparkles) sparkleByCell.set(s.i, s)

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const i = row * cols + col
          const cx = col * cell + cell / 2
          const cy = row * cell + cell / 2

          // Ambient drift: a slow diagonal wave nudges every cell so the field
          // breathes even at rest. Kept tiny so it never fights the pointer.
          const wave =
            Math.sin(now * AMBIENT_SPEED + (cx + cy) * AMBIENT_FREQ * 0.06) *
            AMBIENT_AMP
          const waveY =
            Math.cos(
              now * AMBIENT_SPEED * 0.8 + (cx - cy) * AMBIENT_FREQ * 0.05
            ) * AMBIENT_AMP

          // Blend the cell's own accent with its diagonal neighbour's so the
          // colour shifts flow as a smooth wave across the denser grid rather
          // than a hard checkerboard.
          const accentA = accents[(col + row) % accents.length]
          const accentB = accents[(col + row + 1) % accents.length]
          const waveMix = 0.5 + 0.5 * Math.sin(now * 0.0004 + (cx - cy) * 0.02)
          let s = size * (0.5 + sc[i] * 0.5)
          let fill =
            cm[i] > 0.02
              ? mix(base, mix2(accentA, accentB, waveMix), cm[i])
              : mix(base, base, 0)
          let alpha = 0.18 + cm[i] * 0.62
          let x = cx + ox[i] + wave - s / 2
          let y = cy + oy[i] + waveY - s / 2

          // A live sparkle flares the cell: scale up, full accent, brief glow.
          const sparkle = sparkleByCell.get(i)
          if (sparkle) {
            const t = (now - sparkle.born) / SPARKLE_LIFE
            if (t >= 0 && t <= 1) {
              const flare = Math.sin(t * Math.PI) // 0 → 1 → 0
              s = size * (0.4 + flare * 0.9)
              x = cx + ox[i] + wave - s / 2
              y = cy + oy[i] + waveY - s / 2
              fill = mix(base, sparkle.accent, 0.35 + flare * 0.65)
              alpha = 0.2 + flare * 0.8
            }
          }

          ctx.fillStyle = fill
          ctx.globalAlpha = alpha
          ctx.fillRect(x, y, s, s)
        }
      }
      ctx.globalAlpha = 1
    }

    const step = (now: number) => {
      let active = false

      // Sparkle rate is fixed (TUNE_SPARKLE); 0 would disable ambient sparkles.
      const sparkleEvery =
        TUNE_SPARKLE <= 0.001 ? Infinity : SPARKLE_EVERY / TUNE_SPARKLE

      // Decay the trail: drop samples older than a moment.
      const trailCutoff = now - 420
      while (trail.length > 0 && trail[0].at < trailCutoff) trail.shift()

      // Spawn ambient sparkles on a timer, plus a wake sparkle near the pointer.
      if (now - lastSparkleAt > sparkleEvery) {
        lastSparkleAt = now
        spawnSparkle(now)
        if (pointerIn) spawnSparkle(now, pointerX, pointerY)
      }
      // Retire dead sparkles and ripples.
      sparkles = sparkles.filter((s) => now - s.born < SPARKLE_LIFE)
      ripples = ripples.filter((r) => now - r.born < RIPPLE_LIFE)

      // Pointer speed (px/ms) → a 0..1 "energy" that scales every part of the
      // effect. The curve keeps a raised floor so slow movement still reads,
      // then steepens hard (exponent ~2) so a fast flick spikes the field.
      // Speed also widens the influence radius and lengthens the comet, so a
      // quick gesture disturbs a larger swath.
      const speed = Math.hypot(pointerVX, pointerVY)
      // TUNE_SNAP steepens the speed→energy curve so a flick spikes harder.
      const raw = Math.min(1, (speed * TUNE_SNAP) / SPEED_REF)
      const targetEnergy = Math.pow(raw, 2) // gentle floor, hot top end
      energy += (targetEnergy - energy) * 0.35 // ease energy itself, no pops

      const dirX = speed > 0.001 ? pointerVX / speed : 0
      const dirY = speed > 0.001 ? pointerVY / speed : 0
      // Radius grows with speed: a fast cursor reaches further. TUNE_REACH
      // scales the whole influence radius so the comet disturbs a wider swath.
      const radius = RADIUS * (0.75 + energy * 0.7) * TUNE_REACH
      // Displacement, scale, and colour all scale with energy — but the floor
      // stays high enough that even a slow hover clearly moves pixels.
      // TUNE_POWER scales the overall force.
      const push = PUSH * (0.45 + energy * 0.55) * TUNE_POWER
      const gain = (0.45 + energy * 0.55) * TUNE_POWER
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const i = row * cols + col
          const cx = col * cell + cell / 2
          const cy = row * cell + cell / 2

          let tx = 0
          let ty = 0
          let ts = 0
          let tc = 0

          // Click ripples: an expanding ring shoves and ignites cells as the
          // wavefront passes, then fades. Strongest at the ring's leading edge.
          for (let k = 0; k < ripples.length; k++) {
            const r = ripples[k]
            const age = now - r.born
            const front = age * RIPPLE_SPEED // wavefront radius in px
            const dx = cx - r.x
            const dy = cy - r.y
            const dist = Math.hypot(dx, dy)
            const band = Math.abs(dist - front)
            if (dist > 0.001 && band < RIPPLE_WIDTH) {
              const fade = 1 - age / RIPPLE_LIFE // whole ripple cools over time
              const edge = 1 - band / RIPPLE_WIDTH // hottest at the wavefront
              const force = edge * edge * fade
              tx += (dx / dist) * force * RIPPLE_PUSH
              ty += (dy / dist) * force * RIPPLE_PUSH
              ts += force
              tc += force
            }
          }

          if (pointerIn) {
            const dx = cx - pointerX
            const dy = cy - pointerY
            const dist = Math.hypot(dx, dy)
            if (dist < radius && dist > 0.001) {
              const t = 1 - dist / radius
              // Smoothstep falloff: hot at the centre, gliding to zero at the
              // rim, which reads as a fluid swell rather than a hard edge.
              const force = t * t * (3 - 2 * t)
              // Radial push plus a directional shove along the pointer's
              // travel, so the field parts like a comet passing through. Both
              // scale with energy, so a slow hover only nudges.
              const shove = force * push
              tx = (dx / dist) * shove + dirX * force * push * energy * 0.9
              ty = (dy / dist) * shove + dirY * force * push * energy * 0.9
              ts = force * gain
              tc = force * gain
            }
          }

          // Trail cells stay warm briefly after the pointer has moved on; the
          // trail's reach and heat also scale with the energy that made it.
          if (tc < 0.4) {
            const trailRadius = radius * 0.6
            for (let k = trail.length - 1; k >= 0; k--) {
              const p = trail[k]
              const dx = cx - p.x
              const dy = cy - p.y
              const dist = Math.hypot(dx, dy)
              if (dist < trailRadius) {
                const age = 1 - (now - p.at) / 420
                const glow = (1 - dist / trailRadius) * age * 0.5 * gain
                if (glow > tc) tc = glow
                if (glow > ts) ts = glow * 0.6
              }
            }
          }

          ox[i] += (tx - ox[i]) * EASE
          oy[i] += (ty - oy[i]) * EASE
          sc[i] += (ts - sc[i]) * EASE
          cm[i] += (tc - cm[i]) * EASE

          if (
            Math.abs(ox[i]) > 0.05 ||
            Math.abs(oy[i]) > 0.05 ||
            Math.abs(sc[i]) > 0.005 ||
            Math.abs(cm[i]) > 0.005
          ) {
            active = true
          }
        }
      }

      // Velocity and energy decay each frame so the comet shove fades after a
      // flick and the field settles back to a gentle ripple. Slower velocity
      // decay lets the comet glide longer, which reads as smoother/fluid.
      pointerVX *= 0.92
      pointerVY *= 0.92
      energy *= 0.95

      draw(now)

      // Keep the loop alive while anything moves: pointer, easing cells, a
      // live sparkle, or an expanding ripple. Ambient sparkles spawn on a
      // timer, so in practice the loop keeps ticking even at rest; it only
      // parks when reduced-motion disables the field entirely.
      if (active || pointerIn || sparkles.length > 0 || ripples.length > 0) {
        raf = window.requestAnimationFrame(step)
      } else {
        running = false
        raf = 0
      }
    }

    const kick = () => {
      if (!running) {
        running = true
        raf = window.requestAnimationFrame(step)
      }
    }

    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      const now = performance.now()

      // Estimate pointer velocity from the last sample, smoothed so a single
      // jittery event doesn't spike the energy. This is what makes the effect
      // track *how* the cursor moves, not just *where* it is.
      const dt = Math.max(1, now - lastMoveAt)
      if (pointerIn) {
        const ivx = (x - pointerX) / dt
        const ivy = (y - pointerY) / dt
        pointerVX += (ivx - pointerVX) * SPEED_SMOOTH
        pointerVY += (ivy - pointerVY) * SPEED_SMOOTH
      }
      lastMoveAt = now

      pointerX = x
      pointerY = y
      pointerIn =
        x >= -RADIUS &&
        y >= -RADIUS &&
        x <= rect.width + RADIUS &&
        y <= rect.height + RADIUS

      if (pointerIn) {
        trail.push({ x, y, at: now })
        if (trail.length > TRAIL) trail.shift()
      }
      kick()
    }

    const onPointerLeave = () => {
      pointerIn = false
      pointerVX = 0
      pointerVY = 0
      energy = 0
      kick() // let cells ease back to rest, then the loop stops
    }

    // The field sits under the UI (pointer-events: none), so a click lands on
    // whatever foreground element is there. The entry overlay is transparent
    // and full-viewport, so its *panel* (not the overlay itself) is the thing
    // to ignore — tapping the exposed pixels around the panel should still
    // ripple. Buttons, controls, and cards are ignored for the same reason.
    const isFieldBackground = (target: EventTarget | null): boolean => {
      const el = target instanceof Element ? target : null
      if (!el) return true
      return !el.closest(
        "button, a, input, select, textarea, label, summary, dialog, " +
          "[role='dialog'], [role='button'], [role='menuitem'], " +
          "[role='option'], [contenteditable='true'], " +
          ".study-entry-inner, .study-entry-panel, .study-header-bar, " +
          ".study-notice, .study-panel, .study-card, .study-side"
      )
    }

    // A background click drops a ripple at the pointer: an expanding ring that
    // shoves and ignites cells as it sweeps outward, then cools. This is the
    // "pulse that reverberates" — a deliberate tap on empty space sends a wave
    // through the whole field.
    const onPointerDown = (event: PointerEvent) => {
      if (!isFieldBackground(event.target)) return
      const rect = canvas.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) return
      ripples.push({ x, y, born: performance.now() })
      // A click also throws a small burst of sparkles around the impact point.
      const now = performance.now()
      for (let n = 0; n < 3; n++) spawnSparkle(now, x, y)
      kick()
    }

    resize()
    window.addEventListener("resize", resize)

    if (!reduced) {
      window.addEventListener("pointermove", onPointerMove, { passive: true })
      window.addEventListener("pointerdown", onPointerDown, { passive: true })
      document.addEventListener("pointerleave", onPointerLeave)
      // Start the ambient sparkle loop so the field glints even before the
      // pointer first enters.
      kick()
    }

    // Re-read theme colours if the day/night attribute flips while mounted.
    const observer = new MutationObserver(readTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    })

    return () => {
      window.removeEventListener("resize", resize)
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("pointerleave", onPointerLeave)
      observer.disconnect()
      if (raf) window.cancelAnimationFrame(raf)
    }
  }, [motion])

  return (
    <canvas ref={canvasRef} className="study-pixel-field" aria-hidden="true" />
  )
}
