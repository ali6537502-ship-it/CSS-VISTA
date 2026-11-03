export type PrivacyChoiceResult = 'requested' | 'unavailable'
type ReadyCallback = { CONSENT_API_READY: () => void }
export type PrivacyWindow = {
  googlefc?: {
    callbackQueue?: { push: (callback: ReadyCallback) => unknown }
    showRevocationMessage?: () => void
  }
}

/** Google supports consent API calls through its readiness queue.
 * This queues only an explicit user request; it never loads an ad or CMP tag.
 * https://developers.google.com/funding-choices/fc-api-docs
 */
export function requestPrivacyChoices(target: PrivacyWindow, onResult: (result: PrivacyChoiceResult) => void) {
  let active = true
  const finish = (result: PrivacyChoiceResult) => {
    if (!active) return
    active = false
    clearTimeout(timeout)
    onResult(result)
  }
  const timeout = setTimeout(() => finish('unavailable'), 10000)
  try {
    target.googlefc ??= {}
    const queue = target.googlefc.callbackQueue ??= new Array<ReadyCallback>()
    queue.push({ CONSENT_API_READY: () => {
      if (!active) return
      try {
        if (typeof target.googlefc?.showRevocationMessage !== 'function') return finish('unavailable')
        target.googlefc.showRevocationMessage()
        // The API call is not evidence that a regional message was displayed.
        finish('requested')
      } catch { finish('unavailable') }
    } })
  } catch { finish('unavailable') }
  return () => { active = false; clearTimeout(timeout) }
}
