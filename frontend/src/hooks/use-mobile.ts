/* eslint-disable react-hooks/set-state-in-effect -- shadcn 标准实现 */
import * as React from "react"

const MOBILE_BREAKPOINT = 768

function isMobileViewport() {
  if (typeof window === "undefined") return false
  return window.innerWidth < MOBILE_BREAKPOINT
}

export function useIsMobile() {
  // 同步初始化,避免移动端首帧按桌面布局渲染再跳变
  const [isMobile, setIsMobile] = React.useState<boolean>(isMobileViewport)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(isMobileViewport())
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isMobile
}
