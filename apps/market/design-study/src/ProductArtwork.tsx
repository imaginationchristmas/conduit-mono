import {
  Coffee,
  ImageOff,
  NotebookPen,
  PictureInPicture2,
  ShoppingBag,
  Shirt,
  CupSoda,
} from "lucide-react"
import type { StudyProduct } from "./fixtures"

// Retro slot glyphs. No pixel fonts or image assets (local-only CSP), so the
// pixel feel comes from square geometry, hard strokes, and the Oshi palette
// applied per artwork category in study.css.
const icons = {
  shirt: Shirt,
  coffee: Coffee,
  bag: ShoppingBag,
  mug: CupSoda,
  print: PictureInPicture2,
  notebook: NotebookPen,
}

export function ProductArtwork({ product }: { product: StudyProduct }) {
  if (product.image) {
    return (
      <img
        src={product.image}
        alt=""
        className="study-artwork object-cover"
        loading="lazy"
      />
    )
  }
  const Icon = product.artwork ? icons[product.artwork] : ImageOff
  return (
    <div className="study-artwork" data-artwork={product.artwork ?? "missing"}>
      <Icon
        className="size-14 sm:size-16"
        strokeWidth={1.75}
        aria-hidden="true"
      />
      <span className="study-label">
        {product.artwork ? "Sample artwork" : "No image available"}
      </span>
    </div>
  )
}
