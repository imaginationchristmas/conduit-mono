import { useEffect, useRef, useState } from "react"
import { Minus, Plus } from "lucide-react"
import { formatSats, type StudyProduct } from "./fixtures"
import { categories, products, stores } from "./fixtures"
import { GameHud, type FoundItem } from "./GameHud"
import { FoundItemSlot } from "./FoundItemSlot"
import { ProductArtwork } from "./ProductArtwork"
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
  // In-place main-view navigation: the grid swaps for a detail panel or the
  // checkout panel inside the market shell — no overlay window — so browsing
  // never leaves the market screen. The two views are mutually exclusive.
  const [detailProduct, setDetailProduct] = useState<StudyProduct | null>(null)
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

  // Closing the in-place detail view returns focus to the originating tile so
  // keyboard users resume browsing where they left off.
  function closeDetail() {
    const productId = detailProduct?.id
    setDetailProduct(null)
    window.setTimeout(() => {
      const tile =
        productId !== undefined
          ? mainRef.current?.querySelector(
              `[data-product-id="${productId}"] .study-product-link`
            )
          : null
      if (tile instanceof HTMLElement) {
        tile.focus()
      } else {
        mainRef.current?.focus()
      }
    }, 0)
  }

  // Opening checkout swaps whatever the main view is showing (grid or detail)
  // for the checkout panel, same in-place pattern as the product detail.
  function openCheckout() {
    setDetailProduct(null)
    setCheckoutOpen(true)
  }

  // Closing the in-place checkout view returns focus to the "Check out" button
  // in the found-items rail so keyboard users resume where they left off.
  function closeCheckout() {
    setCheckoutOpen(false)
    window.setTimeout(() => {
      const trigger = document.querySelector<HTMLElement>(
        "[data-checkout-trigger]"
      )
      if (trigger) {
        trigger.focus()
      } else {
        mainRef.current?.focus()
      }
    }, 0)
  }

  // Clicking an item title in checkout swaps straight to that item's in-place
  // detail view (same navigation pattern as the grid), so the shopper can
  // review the listing without losing their collected items.
  function viewCheckoutItem(product: StudyProduct) {
    setCheckoutOpen(false)
    setDetailProduct(product)
  }

  // Quantity steppers at checkout mirror the found-items rail: plus collects
  // another unit, minus removes one (the stack disappears at zero).
  function incrementItem(product: StudyProduct) {
    collectItem(product)
  }

  function decrementItem(product: StudyProduct) {
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
        inert={entry !== null ? true : undefined}
        aria-hidden={entry !== null ? true : undefined}
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
          {checkoutOpen ? (
            <section className="study-checkout" aria-label="Checkout">
              <button
                type="button"
                className="study-tab study-detail-back"
                onClick={closeCheckout}
              >
                ← Back to market
              </button>
              <div className="study-checkout-info">
                <h2 className="study-detail-title">Checkout</h2>
                <p
                  className="study-checkout-note"
                  style={{ fontSize: "var(--step--1)" }}
                >
                  Design preview — no real payment happens. This is where
                  payment fields (Lightning invoice, NWC, WebLN) will be
                  explored.
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
                        <FoundItemSlot
                          product={item.product}
                          count={item.count}
                        />
                        <button
                          type="button"
                          className="study-checkout-row-title study-checkout-item-link"
                          aria-label={`View ${item.product.title}`}
                          onClick={() => viewCheckoutItem(item.product)}
                        >
                          {item.product.title}
                        </button>
                        <span
                          className="study-checkout-qty"
                          role="group"
                          aria-label={`Quantity of ${item.product.title}`}
                        >
                          <button
                            type="button"
                            className="study-checkout-qty-btn"
                            aria-label={`Remove one ${item.product.title}`}
                            onClick={() => decrementItem(item.product)}
                          >
                            <Minus className="size-4" aria-hidden="true" />
                          </button>
                          <span
                            key={item.count}
                            className="study-checkout-qty-count tabular-nums"
                            aria-hidden="true"
                          >
                            {item.count}
                          </span>
                          <button
                            type="button"
                            className="study-checkout-qty-btn"
                            aria-label={`Add one ${item.product.title}`}
                            onClick={() => incrementItem(item.product)}
                          >
                            <Plus className="size-4" aria-hidden="true" />
                          </button>
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
                  <Button
                    type="button"
                    className="study-tab study-btn-accent"
                    disabled={foundItems.length === 0}
                    onClick={closeCheckout}
                  >
                    Pay (pretend)
                  </Button>
                </div>
              </div>
            </section>
          ) : detailProduct ? (
            <section
              className="study-detail"
              aria-label={`${detailProduct.title} details`}
            >
              <button
                type="button"
                className="study-tab study-detail-back"
                onClick={closeDetail}
              >
                ← Back to market
              </button>
              <div className="study-detail-artwork">
                <ProductArtwork product={detailProduct} />
              </div>
              <div className="study-detail-info">
                <h2 className="study-detail-title">{detailProduct.title}</h2>
                <p className="study-detail-store">
                  Sample listing from {detailProduct.store}. This is a design
                  preview, not a product for sale.
                </p>
                <p className="study-detail-price tabular-nums">
                  {formatSats(detailProduct.sats)}
                </p>
                <p className="study-detail-note">
                  Use this space to explore product details. Shipping, checkout,
                  and merchant links are intentionally disconnected.
                </p>
                <Button
                  type="button"
                  className="study-tab study-btn-accent"
                  disabled={detailProduct.soldOut}
                  onClick={() => collectItem(detailProduct)}
                >
                  {detailProduct.soldOut ? "Sold out" : "Collect"}
                </Button>
              </div>
            </section>
          ) : shownProducts.length > 0 ? (
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
                  onView={setDetailProduct}
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
            onCheckout={openCheckout}
            onView={setDetailProduct}
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
    </div>
  )
}
