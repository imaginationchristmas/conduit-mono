import { useState } from "react"
import { Plus } from "lucide-react"
import { formatSats, type StudyProduct } from "./fixtures"
import { ProductArtwork } from "./ProductArtwork"
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui"

export function StudyProductCard({
  product,
  onAdd,
  onView,
  showStoreLabel = true,
  tileMode = "info",
}: {
  product: StudyProduct
  onAdd: (product: StudyProduct, option?: string) => void
  /** Opens the in-place detail view (owned by StudyPage). */
  onView: (product: StudyProduct) => void
  showStoreLabel?: boolean
  /** "picture" renders a cover-art-only tile (photo-wall browsing). */
  tileMode?: "info" | "picture"
}) {
  const [option, setOption] = useState(product.options?.[0])
  const picture = tileMode === "picture"
  return (
    <li
      className="study-card"
      data-product-id={product.id}
      data-tile={tileMode}
    >
      <button
        type="button"
        className="study-product-link"
        aria-label={`View ${product.title}`}
        onClick={() => onView(product)}
      >
        <ProductArtwork product={product} mode={tileMode} />
        {!picture && (
          <h2 className="study-block study-card-title line-clamp-2">
            {product.title}
          </h2>
        )}
      </button>
      {/* Picture mode is cover-art only: the tile keeps the artwork and the
          accessible "View …" button, with details in the dialog. */}
      {!picture && (
        <div className="study-card-blocks">
          {showStoreLabel && (
            <p className="study-label study-block">{product.store}</p>
          )}
          {product.options && (
            <Select value={option} onValueChange={setOption}>
              <SelectTrigger aria-label={`Option for ${product.title}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {product.options.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="mt-auto flex flex-wrap items-stretch justify-between gap-2">
            <span className="study-block study-block-price">
              {formatSats(product.sats)}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="study-tab h-9"
              disabled={product.soldOut}
              aria-label={
                product.soldOut
                  ? `${product.title} is sold out`
                  : `Collect ${product.title}`
              }
              onClick={() => onAdd(product, option)}
            >
              {!product.soldOut && (
                <Plus className="size-4" aria-hidden="true" />
              )}
              {product.soldOut ? "Sold out" : "Add"}
            </Button>
          </div>
        </div>
      )}
    </li>
  )
}
