import type { ReactElement } from "react"
import { useTheme } from "../../../../packages/ui/src/hooks/useTheme"
import type { ThemePreference } from "../../../../packages/ui/src/theme"
import { cn } from "./ui"

/*
 * Study-local compact theme toggle: one icon button that cycles through
 * Light -> Dark -> System on each click, minimizing header footprint.
 *
 * Motion: transitions.dev "icon swap" recipe (#09) — all three glyphs stay
 * mounted stacked in one grid cell; the active one fades in while the others
 * fade out with a 2px blur and scale, 250ms ease-in-out, symmetric both
 * directions. Pure CSS, driven by data-state. Guarded by
 * prefers-reduced-motion. Custom glyphs keep the look Oshi-specific.
 */

const CYCLE: ThemePreference[] = ["day-market", "night-market", "system"]

const LABELS: Record<ThemePreference, string> = {
  "day-market": "Light",
  "night-market": "Dark",
  system: "System",
}

function LightGlyph() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      className="size-4"
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="3.5" />
      <path d="M10 1.5v2M10 16.5v2M1.5 10h2M16.5 10h2M4 4l1.4 1.4M14.6 14.6L16 16M16 4l-1.4 1.4M5.4 14.6L4 16" />
    </svg>
  )
}

function DarkGlyph() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
      aria-hidden="true"
    >
      {/* Classic crescent, centered on the 20px grid */}
      <path d="M10 2.5a5 5 0 0 0 7.5 7.5 7.5 7.5 0 1 1-7.5-7.5Z" />
    </svg>
  )
}

function SystemGlyph() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
      aria-hidden="true"
    >
      <rect x="2" y="4" width="16" height="10" rx="1.5" />
      <path d="M7 17h6M10 14v3" />
    </svg>
  )
}

const GLYPHS: Record<ThemePreference, () => ReactElement> = {
  "day-market": LightGlyph,
  "night-market": DarkGlyph,
  system: SystemGlyph,
}

export function StudyThemeToggle() {
  const { preference, setPreference } = useTheme()
  const nextPreference =
    CYCLE[(CYCLE.indexOf(preference) + 1) % CYCLE.length] ?? CYCLE[0]

  return (
    <button
      type="button"
      aria-label={`Appearance: ${LABELS[preference]}. Switch to ${LABELS[nextPreference]}`}
      title={`Appearance: ${LABELS[preference]} — click for ${LABELS[nextPreference]}`}
      data-state={preference}
      className={cn(
        "study-theme-toggle",
        "study-icon-swap",
        "rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] shadow-sm hover:bg-[var(--surface-elevated)]"
      )}
      onClick={() => setPreference(nextPreference)}
    >
      {CYCLE.map((value) => {
        const Glyph = GLYPHS[value]
        return (
          <span
            key={value}
            className="study-icon-swap-glyph"
            aria-hidden="true"
          >
            <Glyph />
          </span>
        )
      })}
    </button>
  )
}
