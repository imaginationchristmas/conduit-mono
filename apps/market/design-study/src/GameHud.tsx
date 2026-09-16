import { useEffect, useRef, useState } from "react"
import { ChevronDown, Minus, Trash2 } from "lucide-react"
import { formatSats, type StudyProduct } from "./fixtures"
import { FoundItemSlot } from "./FoundItemSlot"
import { Button } from "./ui"

// One stack per product: collecting the same item again bumps its count rather
// than adding a second slot, like an inventory grid.
export type FoundItem = {
  product: StudyProduct
  count: number
}

type Props = {
  items: FoundItem[]
  /** Opens the in-place checkout view (owned by StudyPage). */
  onCheckout: () => void
  /** Opens the in-place detail view for a collected item (owned by StudyPage). */
  onView: (product: StudyProduct) => void
  /** Removes one unit of a product from the box. */
  onRemove: (product: StudyProduct) => void
  /** Empties the box. */
  onClear: () => void
}

// Found-items box in the right HUD rail: a framed panel of square collectible
// slots with a total count that pops on change. "Review" expands the collected
// list inline in the same rail (no overlay); "Check out" swaps the main view
// for the in-place checkout panel. Session-only — resets on reload.
export function GameHud({
  items,
  onCheckout,
  onView,
  onRemove,
  onClear,
}: Props) {
  const total = items.reduce((sum, item) => sum + item.count, 0)
  const totalSats = items.reduce(
    (sum, item) => sum + item.product.sats * item.count,
    0
  )
  const [expanded, setExpanded] = useState(false)
  const [popped, setPopped] = useState(false)
  const firstRender = useRef(true)

  // Count pop: retrigger the keyframe each time the total changes (skip mount).
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    setPopped(true)
    const timeout = window.setTimeout(() => setPopped(false), 300)
    return () => window.clearTimeout(timeout)
  }, [total])

  // Collapse the review list when the box empties — nothing left to review.
  useEffect(() => {
    if (items.length === 0) {
      setExpanded(false)
    }
  }, [items.length])

  return (
    <section className="study-hud" aria-label="Found items">
      <div className="study-hud-top">
        <div className="study-hud-slots-row">
          <span className="study-dock-label">Found</span>
          <span
            className="study-hud-count tabular-nums"
            data-pop={popped ? "true" : undefined}
            aria-live="polite"
          >
            {total}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {items.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="study-tab h-8"
              aria-label="Clear found items"
              onClick={onClear}
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Clear
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="study-tab h-8"
            aria-expanded={expanded}
            aria-controls="found-items-list"
            aria-label={`Review found items, ${total} total`}
            onClick={() => setExpanded((value) => !value)}
          >
            {/* Accordion chevron (transitions.dev #21): flips vertically via
                scaleY when the button is expanded. */}
            <ChevronDown className="t-acc-chevron size-4" aria-hidden="true" />
            Review
          </Button>
        </div>
      </div>
      {/* Accordion panel (transitions.dev #21): always mounted so the height
          animates via grid-template-rows; aria-hidden + visibility keep the
          collapsed content out of the tab order. */}
      <div
        id="found-items-list"
        className="study-hud-list t-acc-panel"
        data-open={expanded ? "true" : "false"}
        aria-hidden={!expanded}
        inert={!expanded}
      >
        <div className="t-acc-panel-inner study-hud-list-inner">
          {items.length === 0 ? (
            <p className="study-hud-empty">
              Nothing collected yet. Use the Add button on a product tile.
            </p>
          ) : (
            <ul aria-label="Collected items">
              {items.map((item) => (
                <li key={item.product.id} className="study-hud-row">
                  <FoundItemSlot product={item.product} count={item.count} />
                  <button
                    type="button"
                    className="study-hud-row-title study-hud-item-link"
                    title={item.product.title}
                    aria-label={`View ${item.product.title}`}
                    onClick={() => onView(item.product)}
                  >
                    {item.product.title}
                  </button>
                  <span className="study-hud-row-price tabular-nums">
                    {formatSats(item.product.sats * item.count)}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="study-tab h-7 shrink-0"
                    aria-label={`Remove one ${item.product.title}`}
                    onClick={() => onRemove(item.product)}
                  >
                    <Minus className="size-3.5" aria-hidden="true" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <div className="study-hud-footer">
            <span className="study-hud-total tabular-nums">
              {formatSats(totalSats)}
            </span>
            <Button
              type="button"
              className="study-tab study-btn-accent"
              disabled={total === 0}
              onClick={onCheckout}
              data-checkout-trigger
            >
              Check out (pretend)
            </Button>
          </div>
        </div>
      </div>
      {/* Slot strip only when the review list is collapsed — no duplicate. */}
      {!expanded && (
        <div className="study-hud-slots">
          {items.length === 0 ? (
            <span className="study-hud-empty">No items yet</span>
          ) : (
            items.map((item) => (
              <FoundItemSlot
                key={item.product.id}
                product={item.product}
                count={item.count}
              />
            ))
          )}
        </div>
      )}
    </section>
  )
}
