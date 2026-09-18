import { type StudySettings, type TileMode } from "./settings"
import { Button, Switch } from "./ui"

type Props = {
  settings: StudySettings
  onSettings: (settings: StudySettings) => void
}

// Mobile bottom dock: a fixed retro strip pinned to the bottom of the viewport
// holding the display toggles that make sense on a small screen — CRT
// scanlines, Store labels (default ON), and View mode (default Info). The
// Motion toggle is intentionally omitted on mobile: the pixel field is frozen
// below 80rem, so there is nothing to toggle. Rendered only below 80rem by
// StudyPage; the desktop StudyDock (which also carries Motion + Reset) is
// untouched.
export function StudyMobileDock({ settings, onSettings }: Props) {
  function patch(next: Partial<StudySettings>) {
    onSettings({ ...settings, ...next })
  }

  return (
    <div
      className="study-mobile-dock"
      role="group"
      aria-label="Display settings"
    >
      {/* div, not label: a <label> wrapping a Radix Switch double-fires the
          click (label activation + switch click), toggling on and off. The
          Switch carries its own aria-label. */}
      <div className="study-dock-group">
        <span className="study-dock-label">CRT</span>
        <Switch
          checked={settings.scanlines}
          onCheckedChange={(checked) => patch({ scanlines: checked })}
          aria-label="CRT scanlines"
        />
      </div>
      <div className="study-dock-group">
        <span className="study-dock-label">Labels</span>
        <Switch
          checked={settings.showStoreLabels}
          onCheckedChange={(checked) => patch({ showStoreLabels: checked })}
          aria-label="Store labels on product tiles"
        />
      </div>
      <div className="study-dock-group">
        <span className="study-dock-label">View</span>
        <div className="flex gap-1" role="group" aria-label="Tile view mode">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="study-tab"
            aria-pressed={settings.tileMode === "info"}
            onClick={() => patch({ tileMode: "info" as TileMode })}
          >
            Info
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="study-tab"
            aria-pressed={settings.tileMode === "picture"}
            onClick={() => patch({ tileMode: "picture" as TileMode })}
          >
            Picture
          </Button>
        </div>
      </div>
    </div>
  )
}
