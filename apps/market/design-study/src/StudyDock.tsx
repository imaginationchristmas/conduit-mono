import {
  DEFAULT_SETTINGS,
  type MotionLevel,
  type StudySettings,
  type TileMode,
} from "./settings"
import { Button, Switch } from "./ui"

type Props = {
  settings: StudySettings
  onSettings: (settings: StudySettings) => void
}

// Bottom HUD dock (OSRS-style toggle strip): the display settings live in one
// framed row of switches and segmented buttons. On the desktop console it is
// pinned as the bottom row of the grid; below 80rem it stacks inline with the
// rails so the same controls stay reachable on every screen size.
//
// The pixel field is intentionally not tunable here: its dials were dialled in
// live and are now fixed constants in StudyPixelField.tsx.
export function StudyDock({ settings, onSettings }: Props) {
  function patch(next: Partial<StudySettings>) {
    onSettings({ ...settings, ...next })
  }

  return (
    <div className="study-dock" role="group" aria-label="Display settings">
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
      {/* Pixel field is fine-grained only now; no density toggle. */}
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
      <div className="study-dock-group">
        <span className="study-dock-label">Motion</span>
        <div className="flex gap-1" role="group" aria-label="Motion level">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="study-tab"
            aria-pressed={settings.motion === "full"}
            onClick={() => patch({ motion: "full" as MotionLevel })}
          >
            Full
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="study-tab"
            aria-pressed={settings.motion === "reduced"}
            onClick={() => patch({ motion: "reduced" as MotionLevel })}
          >
            Calm
          </Button>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="study-tab ml-auto"
        onClick={() => onSettings({ ...DEFAULT_SETTINGS })}
      >
        Reset to defaults
      </Button>
    </div>
  )
}
