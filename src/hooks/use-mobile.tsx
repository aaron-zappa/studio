import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    // Ensure window is defined (prevents SSR errors)
    if (typeof window === 'undefined') {
      return;
    }

    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }

    mql.addEventListener("change", onChange)
    // Set initial state
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)

    // Cleanup listener on unmount
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isMobile === undefined ? false : isMobile // Return false during SSR or initial undefined state
}
