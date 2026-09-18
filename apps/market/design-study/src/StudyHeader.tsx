import { Package, SlidersHorizontal } from "lucide-react"
import { StudyThemeToggle } from "./StudyThemeToggle"
import { useIsMobileLayout } from "./useMediaQuery"
// Study-local logo recolored to the Oshi palette purple (#9A72AA);
// the production logo at apps/market/public/images/logo/logo-full.svg is untouched.
import logo from "./logo-full-oshi.svg"

type Props = {
  /** Opens the centered filters dialog (mobile only). */
  onOpenFilters?: () => void
  /** Opens the centered found-items cart dialog (mobile only). */
  onOpenCart?: () => void
  /** Live count of collected items, shown as a badge on the cart icon. */
  cartCount?: number
}

// The header is brand + controls only. Product search lives in the left HUD
// rail ("Find an item") and the found-items box is the bottom HUD, so there is
// a single search surface and a single collection surface on the page.
//
// Mobile (below 80rem): the left/right rails collapse into two icon buttons
// here — a Filters "tuning" glyph and a Cart "loot box" glyph — sitting beside
// the theme toggle. Each opens its panel as a centered dialog. These buttons
// render only in the mobile layout, so the desktop header is unchanged.
export function StudyHeader({
  onOpenFilters,
  onOpenCart,
  cartCount = 0,
}: Props) {
  const isMobile = useIsMobileLayout()

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
        {/* Mobile-only panel triggers. Each lives in its OWN bevel box (the
            same isolated-box treatment as the brand and the theme controls),
            so the icons read as separate HUD buttons rather than crowding the
            theme toggle. They render only below 80rem; the desktop header is
            unchanged. */}
        {isMobile && (
          <button
            type="button"
            className="study-header-icon-btn"
            aria-label="Open filters"
            aria-haspopup="dialog"
            onClick={onOpenFilters}
          >
            <SlidersHorizontal className="size-5" aria-hidden="true" />
          </button>
        )}
        {isMobile && (
          <button
            type="button"
            className="study-header-icon-btn"
            aria-label={`Open found items, ${cartCount} collected`}
            aria-haspopup="dialog"
            onClick={onOpenCart}
          >
            <Package className="size-5" aria-hidden="true" />
            {cartCount > 0 && (
              <span
                className="study-header-icon-badge tabular-nums"
                aria-hidden="true"
              >
                {cartCount}
              </span>
            )}
          </button>
        )}
        <div className="study-status-controls">
          <StudyThemeToggle />
        </div>
      </div>
    </header>
  )
}
