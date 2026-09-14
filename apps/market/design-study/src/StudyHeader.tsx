import { StudyThemeToggle } from "./StudyThemeToggle"
// Study-local logo recolored to the Oshi palette purple (#9A72AA);
// the production logo at apps/market/public/images/logo/logo-full.svg is untouched.
import logo from "./logo-full-oshi.svg"

// The header is brand + controls only. Product search lives in the left HUD
// rail ("Find an item") and the found-items box is the bottom HUD, so there is
// a single search surface and a single collection surface on the page.
export function StudyHeader() {
  return (
    <header className="study-header-bar">
      <div className="study-shell study-header">
        <a
          href="#products"
          className="flex items-center gap-2"
          aria-label="Conduit Market products"
        >
          <img src={logo} alt="Conduit" className="study-brand-logo" />
          <span className="study-brand-word text-[var(--text-secondary)]">
            market
          </span>
        </a>
        <div className="study-status-controls">
          <StudyThemeToggle />
        </div>
      </div>
    </header>
  )
}
