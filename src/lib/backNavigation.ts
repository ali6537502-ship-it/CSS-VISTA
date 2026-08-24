import { useEffect, useLayoutEffect, useRef } from 'react'

const PAGE_BACK_EVENT = 'cssvista:page-back'

export function requestPageBack() {
  const event = new Event(PAGE_BACK_EVENT, { cancelable: true })
  window.dispatchEvent(event)
  return event.defaultPrevented
}

export function usePageBack(active: boolean, onBack: () => void) {
  const onBackRef = useRef(onBack)
  const inactiveScrollRef = useRef(0)
  const wasActiveRef = useRef(active)

  useEffect(() => {
    onBackRef.current = onBack
  }, [onBack])

  useEffect(() => {
    if (!active) return
    const handleBack = (event: Event) => {
      event.preventDefault()
      event.stopImmediatePropagation()
      onBackRef.current()
    }
    window.addEventListener(PAGE_BACK_EVENT, handleBack)
    return () => window.removeEventListener(PAGE_BACK_EVENT, handleBack)
  }, [active])

  useEffect(() => {
    if (active) return
    const capture = () => {
      inactiveScrollRef.current = Math.max(0, Math.round(window.scrollY))
    }
    capture()
    window.addEventListener('scroll', capture, { passive: true })
    document.addEventListener('pointerdown', capture, true)
    return () => {
      window.removeEventListener('scroll', capture)
      document.removeEventListener('pointerdown', capture, true)
    }
  }, [active])

  useLayoutEffect(() => {
    const wasActive = wasActiveRef.current
    wasActiveRef.current = active
    if (!wasActive || active) return

    const target = inactiveScrollRef.current
    const startedAt = performance.now()
    let frame = 0
    let cancelled = false
    const cancelRestore = () => { cancelled = true }
    const restore = () => {
      if (cancelled) return
      const maximum = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
      const reachableTarget = Math.min(target, maximum)
      if (Math.abs(window.scrollY - reachableTarget) > 1) {
        window.scrollTo({ top: reachableTarget, left: 0, behavior: 'auto' })
      }
      if (maximum < target - 1 && performance.now() - startedAt < 900) {
        frame = window.requestAnimationFrame(restore)
      }
    }

    window.addEventListener('wheel', cancelRestore, { passive: true })
    window.addEventListener('touchstart', cancelRestore, { passive: true })
    window.addEventListener('pointerdown', cancelRestore, { passive: true })
    window.addEventListener('keydown', cancelRestore)
    restore()

    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('wheel', cancelRestore)
      window.removeEventListener('touchstart', cancelRestore)
      window.removeEventListener('pointerdown', cancelRestore)
      window.removeEventListener('keydown', cancelRestore)
    }
  }, [active])
}
