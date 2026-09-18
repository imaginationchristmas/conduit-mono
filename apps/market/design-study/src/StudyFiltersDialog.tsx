import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui"
import { StudyFiltersBody } from "./StudySidePanel"
import type { StudyProduct } from "./fixtures"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
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

// Mobile filters surface: the same StudyFiltersBody the desktop rail renders,
// presented as a centered Dialog (focus-trapped, Escape/overlay to close).
// Rendered only below 80rem by StudyPage; the desktop rail is untouched.
export function StudyFiltersDialog({
  open,
  onOpenChange,
  resultCount,
  ...bodyProps
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="study-dialog"
        aria-label="Filters"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="study-dialog-title">Filters</DialogTitle>
          <DialogDescription>
            Narrow the sample catalogue. Changes apply to the market behind this
            panel.
          </DialogDescription>
        </DialogHeader>
        <StudyFiltersBody {...bodyProps} resultCount={resultCount} />
        <DialogFooter className="study-dialog-footer">
          <Button
            type="button"
            className="study-tab w-full"
            onClick={() => onOpenChange(false)}
          >
            Show {resultCount} {resultCount === 1 ? "result" : "results"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
