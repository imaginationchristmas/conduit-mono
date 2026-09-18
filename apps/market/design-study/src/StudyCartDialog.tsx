import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui"
import { StudyCartBody, type FoundItem } from "./GameHud"
import type { StudyProduct } from "./fixtures"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: FoundItem[]
  onCheckout: () => void
  onView: (product: StudyProduct) => void
  onRemove: (product: StudyProduct) => void
  onClear: () => void
}

// Mobile found-items surface: the same StudyCartBody the desktop right rail
// renders, presented as a centered Dialog (focus-trapped, Escape/overlay to
// close). Rendered only below 80rem by StudyPage; the desktop rail is
// untouched. Checkout/detail still swap the main view in place — the dialog
// closes first so the revealed view is visible.
export function StudyCartDialog({ open, onOpenChange, ...bodyProps }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="study-dialog"
        aria-label="Found items"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="study-dialog-title">Found items</DialogTitle>
          <DialogDescription>
            Your collected sample items. Review, remove, or check out (pretend).
          </DialogDescription>
        </DialogHeader>
        <StudyCartBody {...bodyProps} />
      </DialogContent>
    </Dialog>
  )
}
