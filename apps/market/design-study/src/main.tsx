import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { initializeTheme } from "../../../../packages/ui/src/theme"
import { THEME_STORAGE_KEY } from "../../../../packages/ui/src/theme/definitions"
import { StudyPage } from "./StudyPage"
import "../../../../packages/ui/src/styles/theme.css"
import "../../../../packages/ui/src/styles/typography.css"
import "./study.css"

// This is deliberately not Market's main.tsx. Theme is the only shared runtime.

// The study defaults to the night-market (dark) appearance: seed the stored
// preference before the shared runtime initializes, but only when the visitor
// has not already chosen light/system — an explicit choice always wins.
try {
  if (window.localStorage.getItem(THEME_STORAGE_KEY) === null) {
    window.localStorage.setItem(THEME_STORAGE_KEY, "night-market")
  }
} catch {
  // Storage unavailable: the shared runtime falls back to its own default.
}

initializeTheme()

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <StudyPage />
  </StrictMode>
)
