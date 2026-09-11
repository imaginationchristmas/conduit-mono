import { useEffect, useRef } from "react"
import { Coffee, Home, Pencil, Shirt } from "lucide-react"
import logo from "./logo-full-oshi.svg"
import { Button, Input } from "./ui"

/*
 * Two-step entry screen for the study:
 *
 *   1. "title"     — retro title card. "Press Start" advances to discovery;
 *                    "Skip intro" jumps straight to the market.
 *   2. "discovery" — "What are you looking for?" switcher where the search box,
 *                    category tiles, and auto-populating merchant chips feed the
 *                    market's own query/category/store state before it opens.
 *
 * Both panels share one overlay so the reveal transition runs once. Motion uses
 * the transitions.dev "panel reveal" recipe (#07) via `t-panel-slide` +
 * `data-open` for the overlay, and the Oshi-standard "icon swap" tokens (#09,
 * see docs/design/oshi/README.md) for the cross-panel swap inside it. When the
 * market is shown the overlay leaves the tab order and accessibility tree with
 * `inert` / `aria-hidden`.
 */

export type EntryPanel = "title" | "discovery"

export type EntryOption = { name: string; count: number }

const CATEGORY_GLYPHS: Record<string, typeof Shirt> = {
  Clothing: Shirt,
  "Food & drink": Coffee,
  Home: Home,
  "Art & stationery": Pencil,
}

type Props = {
  open: boolean
  panel: EntryPanel
  query: string
  onQuery: (query: string) => void
  categories: EntryOption[]
  stores: EntryOption[]
  onStart: () => void
  onSkip: () => void
  onBack: () => void
  onChooseCategory: (category: string) => void
  onChooseStore: (store: string) => void
  onBrowseAll: () => void
}

export function StudyEntryScreen({
  open,
  panel,
  query,
  onQuery,
  categories,
  stores,
  onStart,
  onSkip,
  onBack,
  onChooseCategory,
  onChooseStore,
  onBrowseAll,
}: Props) {
  const startRef = useRef<HTMLButtonElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  // Move focus to each panel's first meaningful control, so keyboard users do
  // not have to tab past the inert market behind the overlay.
  useEffect(() => {
    if (!open) return
    if (panel === "title") startRef.current?.focus()
    else searchRef.current?.focus()
  }, [open, panel])

  // Esc steps back one panel, then skips the intro from the title card.
  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return
      if (panel === "discovery") onBack()
      else onSkip()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, panel, onBack, onSkip])

  // "Auto-populate": as the shopper types, narrow the merchant chips (and mark
  // which category tiles match) straight from the fixture set.
  const needle = query.trim().toLowerCase()
  const matchingStores = needle
    ? stores.filter((store) => store.name.toLowerCase().includes(needle))
    : stores
  const isCategoryMatch = (name: string) =>
    needle.length > 0 && name.toLowerCase().includes(needle)

  return (
    <div
      className="t-panel-slide study-entry"
      data-start-screen=""
      data-entry-panel={panel}
      data-open={open ? "true" : "false"}
      inert={open ? undefined : true}
      aria-hidden={open ? undefined : true}
    >
      <div
        className="study-entry-inner"
        role="dialog"
        aria-modal="true"
        aria-labelledby={panel === "title" ? "entry-title" : "entry-prompt"}
      >
        {panel === "title" ? (
          <div key="title" className="study-entry-panel">
            <span className="flex items-center gap-2">
              <img src={logo} alt="Conduit" className="study-brand-logo" />
              <span className="study-brand-word text-[var(--text-secondary)]">
                market
              </span>
            </span>
            <h1 id="entry-title" className="study-start-title">
              Market Quest
            </h1>
            <p className="study-start-subtitle">
              Sample data only · no real purchases
            </p>
            <div className="flex flex-col items-center gap-3">
              <Button
                ref={startRef}
                type="button"
                size="lg"
                className="study-btn-game"
                onClick={onStart}
              >
                Press Start
              </Button>
              <button
                type="button"
                className="study-start-skip"
                onClick={onSkip}
              >
                Skip intro
              </button>
            </div>
            <p className="study-start-keys">Enter — start · Esc — skip</p>
          </div>
        ) : (
          <div key="discovery" className="study-entry-panel study-discovery">
            <h2 id="entry-prompt" className="study-discovery-title">
              What are you looking for?
            </h2>
            <p className="study-discovery-desc">
              Search, pick a category, or jump to a merchant. Everything is a
              sample fixture.
            </p>

            <div className="study-discovery-search">
              <label htmlFor="entry-search" className="sr-only">
                Search sample products
              </label>
              <Input
                ref={searchRef}
                id="entry-search"
                type="search"
                placeholder="Search products, categories, or shops"
                value={query}
                onChange={(event) => onQuery(event.target.value)}
                className="h-11 rounded-[var(--game-radius)] border-2 border-[var(--game-panel-border)] bg-[var(--game-slot-bg)]"
              />
            </div>

            <fieldset className="study-discovery-group">
              <legend className="study-label">Item categories</legend>
              <ul className="study-discovery-tiles">
                {categories.map((category) => {
                  const Glyph =
                    CATEGORY_GLYPHS[category.name] ?? CATEGORY_GLYPHS.Home
                  return (
                    <li key={category.name}>
                      <button
                        type="button"
                        className="study-discovery-tile"
                        data-match={isCategoryMatch(category.name) || undefined}
                        onClick={() => onChooseCategory(category.name)}
                      >
                        <Glyph className="size-5" aria-hidden="true" />
                        <span className="study-discovery-tile-name">
                          {category.name}
                        </span>
                        <span className="study-discovery-tile-count tabular-nums">
                          {category.count}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </fieldset>

            <fieldset className="study-discovery-group">
              <legend className="study-label">Merchants</legend>
              {matchingStores.length > 0 ? (
                <ul className="study-discovery-chips" aria-live="polite">
                  {matchingStores.map((store) => (
                    <li key={store.name}>
                      <button
                        type="button"
                        className="study-tab"
                        onClick={() => onChooseStore(store.name)}
                      >
                        {store.name}
                        <span className="tabular-nums opacity-70">
                          {store.count}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="study-discovery-empty" role="status">
                  No merchants match “{query.trim()}”. Browse everything
                  instead.
                </p>
              )}
            </fieldset>

            <div className="study-discovery-actions">
              <Button
                type="button"
                variant="outline"
                className="study-tab"
                onClick={onBack}
              >
                Back
              </Button>
              <Button
                type="button"
                className="study-btn-game"
                onClick={onBrowseAll}
              >
                Browse all items
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
