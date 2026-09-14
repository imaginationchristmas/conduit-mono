// Study settings (Phase 3): user-controlled, multi-toggle, persisted to
// localStorage on the study origin only. Defaults preserve the pre-settings
// behavior, so a fresh visitor sees exactly the Phase 2.8 surface.

export type MotionLevel = "full" | "reduced"
/** Tile presentation: full info slot, or a cover-art-only photo wall. */
export type TileMode = "info" | "picture"

export type StudySettings = {
  /** CRT scanline overlay over the whole viewport. */
  scanlines: boolean
  /** Motion level, layered on top of prefers-reduced-motion. */
  motion: MotionLevel
  /** Store labels on product tiles. */
  showStoreLabels: boolean
  /** Info slots (title, price, add) or a photo wall of cover artwork. */
  tileMode: TileMode
}

// The pixel field's tuning dials are no longer user-facing: the values below
// were dialled in against the live field and are now the fixed defaults. The
// remaining constants live in StudyPixelField.tsx (CELL, PUSH, EASE, ...).
export const DEFAULT_SETTINGS: StudySettings = {
  scanlines: false,
  motion: "full",
  showStoreLabels: true,
  tileMode: "info",
}

const SETTINGS_KEY = "study:settings"

function clamp(input: unknown): StudySettings {
  const value = (input ?? {}) as Partial<StudySettings>
  return {
    scanlines: value.scanlines === true,
    motion: value.motion === "reduced" ? "reduced" : "full",
    showStoreLabels: value.showStoreLabels !== false,
    tileMode: value.tileMode === "picture" ? "picture" : "info",
  }
}

export function loadSettings(): StudySettings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY)
    return raw ? clamp(JSON.parse(raw)) : DEFAULT_SETTINGS
  } catch {
    // Storage unavailable or malformed; fall back to defaults.
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(settings: StudySettings): void {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    // Storage unavailable; settings simply do not persist.
  }
}
