import { useEffect, useRef, useState } from "react"
import { formatSats, type StudyProduct } from "./fixtures"
import { categories, products, stores } from "./fixtures"
import { GameHud, type FoundItem } from "./GameHud"
import { FoundItemSlot } from "./FoundItemSlot"
import { StudyDock } from "./StudyDock"
import { StudyEntryScreen } from "./StudyEntryScreen"
import { StudyHeader } from "./StudyHeader"
import { StudyPixelField } from "./StudyPixelField"
import { StudyProductCard } from "./StudyProductCard"
import { StudySidePanel } from "./StudySidePanel"
import { loadSettings, saveSettings, type StudySettings } from "./settings"
import { Button } from "./ui"

// Once-per-session gate for the retro entry screens. sessionStorage is scoped to
// this study's origin and cleared when the tab session ends.
const START_SCREEN_KEY = "study:start-screen-seen"

// null = market visible; "title" and "discovery" are the two entry panels.
type EntryState = "title" | "discovery" | null

function hasSeenStartScreen() {
  try {
    return window.sessionStorage.getItem(START_SCREEN_KEY) === "1"
  } catch {
    return false
  }
}

export function StudyPage() {
  const mainRef = useRef<HTMLElement>(null)
  const [entry, setEntry] = useState<EntryState>(() =>
    hasSeenStartScreen() ? null : "title"
  )
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("All products")
  const [store, setStore] = useState("all")
  const [sort, setSort] = useState("featured")
  const [foundItems, setFoundItems] = useState<FoundItem[]>([])
  // Centered checkout overlay (like the entry screen): the market hides while
  // it is open so the payment fields are easy to read.
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  // Phase 3 settings: loaded once from localStorage, persisted on change.
  const [settings, setSettings] = useState<StudySettings>(loadSettings)
  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  // Discovery options auto-populate from the same fixture set the market
  // renders, so the entry screen can never offer a category or merchant with no
  // matching sample products.
  const categoryOptions = categories.map((name) => ({
    name,
    count: products.filter((product) => product.category === name).length,
  }))
  const storeOptions = stores.map((name) => ({
    name,
    count: products.filter((product) => product.store === name).length,
  }))

  const visibleProducts = products
    .filter(
      (product) =>
        (category === "All products" || product.category === category) &&
        (store === "all" || product.store === store) &&
        `${product.title} ${product.store}`
          .toLowerCase()
          .includes(query.trim().toLowerCase())
    )
    .sort((a, b) =>
      sort === "price-asc"
        ? a.sats - b.sats
        : sort === "price-desc"
          ? b.sats - a.sats
          : 0
    )
  const shownProducts = visibleProducts

  function resetFilters() {
    setQuery("")
    setCategory("All products")
    setStore("all")
    setSort("featured")
  }

  // Collect into the found-items box: one stack per product, count bumps on a
  // repeat collect. Session-only — resets on reload. The chosen option is not
  // tracked in this preview (stacks are per product). The option argument from
  // StudyProductCard is intentionally dropped — stacks are per product.
  function collectItem(product: StudyProduct) {
    setFoundItems((items) => {
      const existing = items.find((item) => item.product.id === product.id)
      if (existing) {
        return items.map((item) =>
          item.product.id === product.id
            ? { ...item, count: item.count + 1 }
            : item
        )
      }
      return [...items, { product, count: 1 }]
    })
  }

  // Leaving the entry overlay always marks the session and lands focus in the
  // revealed market. Skip, category tile, merchant chip, and "browse all" all
  // funnel through here so the handoff behaves identically.
  function dismissEntry() {
    setEntry(null)
    try {
      window.sessionStorage.setItem(START_SCREEN_KEY, "1")
    } catch {
      // Storage can be unavailable; the entry screen simply shows again.
    }
    // Land keyboard focus in the revealed market rather than on the now-inert
    // overlay.
    window.setTimeout(() => mainRef.current?.focus(), 0)
  }

  // "Skip intro" bypasses discovery entirely and shows the unfiltered market.
  function skipIntro() {
    resetFilters()
    dismissEntry()
  }

  // Choosing a tile or chip replaces the search intent, so the shopper lands on
  // a filtered market rather than, say, a search term that matches nothing in
  // the chosen category.
  function chooseCategory(name: string) {
    setQuery("")
    setCategory(name)
    dismissEntry()
  }

  function chooseStore(name: string) {
    setQuery("")
    setStore(name)
    dismissEntry()
  }

  function browseAll() {
    resetFilters()
    dismissEntry()
  }

  // Checkout total across all stacks.
  const checkoutTotalSats = foundItems.reduce(
    (sum, item) => sum + item.product.sats * item.count,
    0
  )

  return (
    <div
      className="study-page"
      data-entry-open={entry !== null ? "true" : undefined}
      data-checkout-open={checkoutOpen ? "true" : undefined}
    >
      <div
        className="study-notice px-4 py-2 text-center"
        style={{ fontSize: "var(--step--1)" }}
      >
        <strong className="text-[var(--text-primary)]">Design study</strong> ·
        Sample data only · No real purchases
      </div>
      <div
        className="study-market"
        data-checkout-open={checkoutOpen ? "true" : undefined}
        inert={entry !== null || checkoutOpen ? true : undefined}
        aria-hidden={entry !== null || checkoutOpen ? true : undefined}
      >
        <a href="#products" className="study-skip-link">
          Skip to products
        </a>
        <StudyHeader />
        {/* Left HUD rail: filters as a foldable box. On desktop it is pinned;
            on mobile it stacks inline above the catalogue. "Find an item"
            type-ahead narrows the market to the chosen product. */}
        <StudySidePanel
          category={category}
          categories={categories}
          onCategory={setCategory}
          store={store}
          stores={stores}
          onStore={setStore}
          sort={sort}
          onSort={setSort}
          onResetFilters={resetFilters}
          products={products}
          onFindItem={(product) => {
            setQuery(product.title)
            setCategory("All products")
            setStore("all")
          }}
          resultCount={shownProducts.length}
        />
        <main
          ref={mainRef}
          id="products"
          tabIndex={-1}
          className="study-shell py-7 sm:py-10"
        >
          {shownProducts.length > 0 ? (
            <ul
              className="study-grid"
              data-tile={settings.tileMode}
              aria-label="Sample products"
            >
              {shownProducts.map((product) => (
                <StudyProductCard
                  key={product.id}
                  product={product}
                  onAdd={collectItem}
                  showStoreLabel={settings.showStoreLabels}
                  tileMode={settings.tileMode}
                />
              ))}
            </ul>
          ) : (
            <section className="study-empty px-4 py-16 text-center">
              <h2
                className="text-balance"
                style={{
                  fontSize: "var(--step-1)",
                  fontWeight: "var(--weight-semibold)",
                }}
              >
                No products found
              </h2>
              <p
                className="my-3 text-[var(--text-secondary)] text-pretty"
                style={{ fontSize: "var(--step--1)" }}
              >
                Try another search or reset the sample filters.
              </p>
              <Button
                type="button"
                variant="outline"
                className="study-tab"
                onClick={resetFilters}
              >
                Reset filters
              </Button>
            </section>
          )}
          <div className="study-rail">
            <span>Market Quest</span>
            <span className="study-rail-sep" aria-hidden="true">
              ·
            </span>
            <span>Sample catalog</span>
            <span className="study-rail-sep" aria-hidden="true">
              ·
            </span>
            <span>Not a live storefront</span>
          </div>
        </main>
        {/* Right HUD rail: study controls and status. Pinned on desktop,
            stacked below the grid on mobile. */}
        <aside
          className="study-side study-side-right"
          aria-label="Found items and study status"
        >
          {/* Found-items box lives in the right rail: the inventory reads as
              part of the game HUD instead of a floating bottom bar. */}
          <GameHud
            items={foundItems}
            onCheckout={() => setCheckoutOpen(true)}
            onRemove={(product) =>
              setFoundItems((items) =>
                items
                  .map((item) =>
                    item.product.id === product.id
                      ? { ...item, count: item.count - 1 }
                      : item
                  )
                  .filter((item) => item.count > 0)
              )
            }
            onClear={() => setFoundItems([])}
          />
        </aside>
        {/* Bottom HUD dock: display toggles (CRT, labels, pixel density,
            motion) as one pinned strip — the OSRS-style control row. */}
        <StudyDock settings={settings} onSettings={setSettings} />
      </div>
      {settings.scanlines && (
        <div className="study-scanlines" aria-hidden="true" />
      )}
      <StudyPixelField motion={settings.motion} />
      <StudyEntryScreen
        open={entry !== null}
        panel={entry ?? "title"}
        query={query}
        onQuery={setQuery}
        categories={categoryOptions}
        stores={storeOptions}
        onStart={() => setEntry("discovery")}
        onSkip={skipIntro}
        onBack={() => setEntry("title")}
        onChooseCategory={chooseCategory}
        onChooseStore={chooseStore}
        onBrowseAll={browseAll}
      />
      {/* Centered checkout overlay: same frame language as the entry screen.
          The market is inert and visually hidden behind it while open. */}
      {checkoutOpen && (
        <div
          className="study-checkout"
          role="dialog"
          aria-modal="true"
          aria-label="Checkout"
        >
          <div className="study-checkout-inner">
            <h1 className="study-checkout-title">Checkout</h1>
            <p
              className="study-checkout-note"
              style={{ fontSize: "var(--step--1)" }}
            >
              Design preview — no real payment happens. This is where payment
              fields (Lightning invoice, NWC, WebLN) will be explored.
            </p>
            {foundItems.length === 0 ? (
              <p
                className="study-checkout-empty"
                style={{ fontSize: "var(--step--1)" }}
              >
                Nothing collected yet.
              </p>
            ) : (
              <ul
                className="study-checkout-list"
                aria-label="Items to check out"
              >
                {foundItems.map((item) => (
                  <li key={item.product.id} className="study-checkout-row">
                    <FoundItemSlot product={item.product} count={item.count} />
                    <span className="study-checkout-row-title">
                      {item.product.title}
                    </span>
                    <span className="study-checkout-row-price tabular-nums">
                      {formatSats(item.product.sats * item.count)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="study-checkout-footer">
              <span className="study-checkout-total tabular-nums">
                {formatSats(checkoutTotalSats)}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="study-tab"
                  onClick={() => setCheckoutOpen(false)}
                >
                  Back to market
                </Button>
                <Button
                  type="button"
                  className="study-tab study-btn-accent"
                  disabled={foundItems.length === 0}
                  onClick={() => setCheckoutOpen(false)}
                >
                  Pay (pretend)
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
