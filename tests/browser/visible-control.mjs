// Keep controls clear of fixed navigation, then use Playwright's native
// visibility, stability and hit-target checks. Never hide overlays or force clicks.
export async function visibleControl(locator, action = 'click') {
  await locator.waitFor({ state: 'visible' })
  await locator.evaluate(element => element.scrollIntoView({ block: 'center', inline: 'nearest' }))
  await locator[action]()
}
