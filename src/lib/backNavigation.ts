import { useEffect, useRef } from 'react'

const PAGE_BACK_EVENT = 'cssvista:page-back'

export function requestPageBack() {
  const event = new Event(PAGE_BACK_EVENT, { cancelable: true })
  window.dispatchEvent(event)
  return event.defaultPrevented
}

export function usePageBack(active: boolean, onBack: () => void) {
  const onBackRef = useRef(onBack)

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
}
