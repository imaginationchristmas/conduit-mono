import {
  Coffee,
  CupSoda,
  ImageOff,
  NotebookPen,
  PictureInPicture2,
  Shirt,
  ShoppingBag,
} from "lucide-react"
import type { StudyProduct } from "./fixtures"

// Square collectible slot for the found-items HUD. Reuses the same retro glyph
// vocabulary as ProductArtwork so a collected item reads as the same object the
// shopper saw on the tile.
const icons = {
  shirt: Shirt,
  coffee: Coffee,
  bag: ShoppingBag,
  mug: CupSoda,
  print: PictureInPicture2,
  notebook: NotebookPen,
}

export function FoundItemSlot({
  product,
  count,
}: {
  product: StudyProduct
  /** Stack count shown as an xN badge when more than one is collected. */
  count: number
}) {
  const Icon = product.artwork ? icons[product.artwork] : ImageOff
  return (
    <span
      className="study-found-slot"
      data-artwork={product.artwork ?? "missing"}
      title={`${product.title}${count > 1 ? ` ×${count}` : ""}`}
    >
      <Icon className="size-5" strokeWidth={1.75} aria-hidden="true" />
      {count > 1 && (
        <span className="study-found-count tabular-nums" aria-hidden="true">
          ×{count}
        </span>
      )}
      <span className="sr-only">
        {product.title}
        {count > 1 ? `, ${count} collected` : ""}
      </span>
    </span>
  )
}
