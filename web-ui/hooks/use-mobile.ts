import * as React from "react"

const MOBILE_BREAKPOINT = 768
const mediaQuery = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

function subscribe(onChange: () => void) {
  const mediaQueryList = window.matchMedia(mediaQuery)
  mediaQueryList.addEventListener("change", onChange)
  return () => mediaQueryList.removeEventListener("change", onChange)
}

function getSnapshot() {
  return window.innerWidth < MOBILE_BREAKPOINT
}

export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, () => false)
}
