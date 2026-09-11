import { useRef, useState } from "react"
import { categories, products, stores, type StudyProduct } from "./fixtures"
import { StudyEntryScreen } from "./StudyEntryScreen"
import { StudyHeader } from "./StudyHeader"
import { StudyPixelField } from "./StudyPixelField"
import { StudyProductCard } from "./StudyProductCard"
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui"

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
  const [preview, setPreview] = useState("loaded")
  const [cartCount, setCartCount] = useState(0)
  const [notice, setNotice] = useState("")

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
  const shownProducts = preview === "empty" ? [] : visibleProducts

  function resetFilters() {
    setQuery("")
    setCategory("All products")
    setStore("all")
    setSort("featured")
    setPreview("loaded")
  }

  function addToDemoCart(product: StudyProduct, option?: string) {
    setCartCount((count) => count + 1)
    setNotice(
      `Added ${product.title}${option ? ` (${option})` : ""} to the demo cart.`
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

  return (
    <div className="study-page">
      <div className="study-notice px-4 py-2 text-center text-xs">
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
        <StudyHeader
          query={query}
          onQuery={setQuery}
          cartCount={cartCount}
          onClearCart={() => {
            setCartCount(0)
            setNotice("Demo cart cleared.")
          }}
        />
        <main
          ref={mainRef}
          id="products"
          tabIndex={-1}
          className="study-shell py-7 sm:py-10"
        >
          <div className="study-section">
            <h1 className="study-section-title">
              <span aria-hidden="true">◆</span> Products
            </h1>
            <p className="study-section-desc">
              Discover goods from independent shops.
            </p>
          </div>

          <div className="study-panel mb-5">
            <fieldset>
              <legend className="study-label mb-2">Category</legend>
              <div className="flex flex-wrap gap-2">
                {["All products", ...categories].map((value) => (
                  <Button
                    key={value}
                    type="button"
                    variant="outline"
                    aria-pressed={category === value}
                    className="study-tab"
                    onClick={() => setCategory(value)}
                  >
                    {value}
                  </Button>
                ))}
              </div>
            </fieldset>
            <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
              <p role="status" className="study-label tabular-nums">
                {preview === "loading"
                  ? "Loading sample products…"
                  : `${shownProducts.length} sample products`}
              </p>
              <div className="grid w-full grid-cols-2 gap-3 sm:w-auto sm:min-w-96">
                <div>
                  <label
                    htmlFor="store-filter"
                    className="study-label mb-1 block"
                  >
                    Shop
                  </label>
                  <Select value={store} onValueChange={setStore}>
                    <SelectTrigger id="store-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All shops</SelectItem>
                      {stores.map((value) => (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label
                    htmlFor="sort-order"
                    className="study-label mb-1 block"
                  >
                    Sort
                  </label>
                  <Select value={sort} onValueChange={setSort}>
                    <SelectTrigger id="sort-order">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="featured">Featured</SelectItem>
                      <SelectItem value="price-asc">
                        Price: low to high
                      </SelectItem>
                      <SelectItem value="price-desc">
                        Price: high to low
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {preview === "loading" ? (
            <div className="study-grid" aria-hidden="true">
              {products.slice(0, 8).map((product) => (
                <div key={product.id} className="study-card">
                  <div className="m-2 aspect-square rounded-[var(--game-radius)] bg-[var(--game-slot-bg)]" />
                  <div className="mx-3 mb-2 h-4 w-2/3 rounded bg-[var(--game-slot-bg)]" />
                  <div className="mx-3 mb-3 h-4 w-1/3 rounded bg-[var(--game-slot-bg)]" />
                </div>
              ))}
            </div>
          ) : shownProducts.length > 0 ? (
            <ul className="study-grid" aria-label="Sample products">
              {shownProducts.map((product) => (
                <StudyProductCard
                  key={product.id}
                  product={product}
                  onAdd={addToDemoCart}
                />
              ))}
            </ul>
          ) : (
            <section className="study-empty px-4 py-16 text-center">
              <h2 className="text-xl font-semibold text-balance">
                No products found
              </h2>
              <p className="my-3 text-sm text-[var(--text-secondary)] text-pretty">
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
          <p role="status" className="mt-4 min-h-5 text-sm">
            {notice}
          </p>

          <details className="study-controls mt-6">
            <summary>Study controls</summary>
            <div className="study-controls-body flex flex-wrap items-end gap-4">
              <div className="w-48">
                <label
                  htmlFor="preview-state"
                  className="study-label mb-1 block"
                >
                  Preview state
                </label>
                <Select value={preview} onValueChange={setPreview}>
                  <SelectTrigger id="preview-state">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="loaded">Loaded</SelectItem>
                    <SelectItem value="loading">Loading</SelectItem>
                    <SelectItem value="empty">Empty</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                variant="outline"
                className="study-tab"
                onClick={resetFilters}
              >
                Reset filters
              </Button>
              <p className="max-w-md text-xs text-[var(--text-secondary)] text-pretty">
                Edit this page, the cards, sample products, and study.css in
                apps/market/design-study/src. All interactions stay in this
                preview.
              </p>
            </div>
          </details>

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
      </div>
      {entry !== null && <StudyPixelField />}
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
