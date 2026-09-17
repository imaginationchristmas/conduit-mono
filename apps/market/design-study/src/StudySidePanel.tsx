import { useState } from "react"
import { ChevronDown } from "lucide-react"
import {
  Button,
  Combobox,
  type ComboboxOption,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui"
import type { StudyProduct } from "./fixtures"

type Props = {
  category: string
  categories: string[]
  onCategory: (value: string) => void
  store: string
  stores: string[]
  onStore: (value: string) => void
  sort: string
  onSort: (value: string) => void
  onResetFilters: () => void
  products: StudyProduct[]
  onFindItem: (product: StudyProduct) => void
  resultCount: number
}

// Left-hand HUD rail: filters as a foldable framed box. Category is a dropdown
// (the original page used pill buttons; the rail favours compact dropdowns),
// and "Find an item" is a type-ahead that auto-selects the matching product.
// Study display settings live in the bottom dock (StudyDock).
export function StudySidePanel({
  category,
  categories,
  onCategory,
  store,
  stores,
  onStore,
  sort,
  onSort,
  onResetFilters,
  products,
  onFindItem,
  resultCount,
}: Props) {
  const categoryOptions: ComboboxOption[] = [
    { value: "All products", label: "All products" },
    ...categories.map((name) => ({ value: name, label: name })),
  ]
  const findOptions: ComboboxOption[] = products.map((product) => ({
    value: product.id,
    label: product.title,
  }))

  // The filters disclosure starts open, like the previous <details open>.
  const [open, setOpen] = useState(true)

  return (
    <aside className="study-side" aria-label="Market controls">
      {/* Accordion disclosure (transitions.dev #21): data-open drives the
          grid-template-rows panel animation and the chevron flip in CSS. */}
      <div className="study-side-box t-acc" data-open={open ? "true" : "false"}>
        <button
          type="button"
          className="study-side-title"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          Filters
          <ChevronDown
            className="study-side-chevron t-acc-chevron size-4"
            aria-hidden="true"
          />
        </button>
        <div className="t-acc-panel" inert={!open}>
          <div className="t-acc-panel-inner">
            <div className="study-side-body">
              <p role="status" className="study-label tabular-nums mb-3">
                {resultCount} sample products
              </p>
              <div>
                <label htmlFor="find-item" className="study-label mb-1 block">
                  Find an item
                </label>
                <Combobox
                  id="find-item"
                  options={findOptions}
                  onValueChange={(value) => {
                    const product = products.find((item) => item.id === value)
                    if (product) onFindItem(product)
                  }}
                  searchPlaceholder="Find an item"
                  emptyText="No items match."
                  searchInTrigger
                  className="study-find-trigger"
                />
              </div>
              <div className="mt-3">
                <label
                  htmlFor="category-filter"
                  className="study-label mb-1 block"
                >
                  Category
                </label>
                <Combobox
                  id="category-filter"
                  value={category}
                  options={categoryOptions}
                  onValueChange={onCategory}
                  placeholder="All products"
                  searchPlaceholder="Search categories…"
                  emptyText="No categories match."
                />
              </div>
              <div className="mt-3">
                <label
                  htmlFor="store-filter"
                  className="study-label mb-1 block"
                >
                  Shop
                </label>
                <Select value={store} onValueChange={onStore}>
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
              <div className="mt-3">
                <label htmlFor="sort-order" className="study-label mb-1 block">
                  Sort
                </label>
                <Select value={sort} onValueChange={onSort}>
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
              <Button
                type="button"
                variant="outline"
                className="study-tab mt-4 w-full"
                onClick={onResetFilters}
              >
                Reset filters
              </Button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
