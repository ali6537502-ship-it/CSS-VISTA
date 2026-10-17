/** Native fixtures may contact only their loopback runtime; never live ads/providers. */
export async function isolateNetwork(context, origin) {
  await context.route('**/*', route => {
    const url = new URL(route.request().url())
    if (url.origin === new URL(origin).origin) return route.continue()
    if (url.hostname === 'pagead2.googlesyndication.com' && url.pathname === '/pagead/js/adsbygoogle.js') {
      return route.fulfill({ contentType: 'text/javascript', body: 'window.adsbygoogle = { push: function() {} };' })
    }
    return route.abort('blockedbyclient')
  })
}
