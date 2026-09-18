import { useEffect, useState } from "react"

// Viewport gate for the mobile layout. The desktop console grid lives entirely
// inside `@media (min-width: 80rem)` in study.css, so 80rem is the single
// breakpoint that separates the two layouts. This hook mirrors that exact
// breakpoint in JS so components can render mobile-only chrome (header icon
// buttons, centered dialogs, the bottom mobile dock) and freeze the pixel
// field's motion on small screens — without touching the desktop path.
//
// `useMediaQuery` is the generic primitive; `useIsMobileLayout` is the named
// convenience for the study's 80rem boundary. Both are SSR/initial-paint safe:
// they read the current match synchronously on mount, then subscribe to
// changes, so there is no flash of the wrong layout on resize.
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return false
    }
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return
    }
    const list = window.matchMedia(query)
    // Sync in case the value changed between initial state and effect.
    setMatches(list.matches)
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches)
    // addEventListener is the modern API; older Safari only has addListener.
    if (list.addEventListener) {
      list.addEventListener("change", onChange)
      return () => list.removeEventListener("change", onChange)
    }
    list.addListener(onChange)
    return () => list.removeListener(onChange)
  }, [query])

  return matches
}

// True when the viewport is BELOW the 80rem desktop breakpoint — i.e. the
// mobile/tablet range where the rails collapse into header-triggered dialogs.
// Keep the unit in rem so it tracks the CSS breakpoint exactly.
export function useIsMobileLayout(): boolean {
  return useMediaQuery("(max-width: 79.99rem)")
}
