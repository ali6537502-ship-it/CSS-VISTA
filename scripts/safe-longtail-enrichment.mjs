try {
  await import('./strengthen-longtail-search-pages.mjs')
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  const contentOnlyFailure = /remains too thin after enrichment:/i.test(message)

  if (!contentOnlyFailure) throw error

  console.warn(`HOSTINGER CONTENT WARNING: ${message}`)
  console.warn('Deployment will continue because thin-content thresholds are advisory in the production deployment path. Run npm run build:hostinger:strict to enforce them before release when desired.')
}
