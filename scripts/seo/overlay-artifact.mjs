/** Add local artifact evidence without overwriting observed production fields.
 * Run after build: node scripts/seo/overlay-artifact.mjs [dist]
 */
import { readFile, writeFile } from 'node:fs/promises'
import { resolve, join, relative } from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { findRouteDefinition, getRoutePolicy } from '../../src/data/routeRegistry.mjs'
import { parseHtaccess, resolveRequest } from '../lib/htaccess-resolver.mjs'
import { loadPastPaperContent } from '../lib/past-paper-content.mjs'
import { primaryContentText } from '../lib/content-quality.mjs'

const root = fileURLToPath(new URL('../..', import.meta.url))
const artifact = resolve(root, process.argv[2] || 'dist')
const inventoryPath = join(root, 'docs/seo/URL_INVENTORY.json')
const report = JSON.parse(await readFile(inventoryPath, 'utf8'))
const rules = parseHtaccess(await readFile(join(artifact, '.htaccess'), 'utf8'))
const papers = new Map((await loadPastPaperContent(root)).map(entry => [`/past-papers/view/${entry.paper.id}`, entry]))
const bookReviews = new Map(JSON.parse(await readFile(join(root, 'src/data/bookEditorial.generated.json'), 'utf8')).books
  .map(book => [`/book-summaries/${book.slug}`, book]))
const noteReviews = new Set(JSON.parse(await readFile(join(root, 'scripts/editorial/optional-note-reviews.json'), 'utf8')).reviews
  .map(review => `/study-material/optional/${review.topic}`))
const sitemapUrls = new Set()
const xmlIndex = await readFile(join(artifact, 'sitemap.xml'), 'utf8')
const childFiles = [...xmlIndex.matchAll(/<loc>([^<]+)<\/loc>/g)].map(x => new URL(x[1]).pathname.replace(/^\//, ''))
for (const file of childFiles) for (const match of (await readFile(join(artifact, file), 'utf8')).matchAll(/<loc>([^<]+)<\/loc>/g)) sitemapUrls.add(match[1])
const cache = new Map()
async function inspect(file) {
  if (cache.has(file)) return cache.get(file)
  const html = await readFile(join(artifact, file), 'utf8')
  const content = primaryContentText(html)
  const value = {
    canonical: /<link\b[^>]*rel="canonical"[^>]*href="([^"]*)"/.exec(html)?.[1] ?? null,
    robots: /<meta\b[^>]*name="robots"[^>]*content="([^"]*)"/.exec(html)?.[1] ?? null,
    title: /<title>([^<]*)<\/title>/.exec(html)?.[1] ?? null,
    main_content_characters: content.length,
    body_sha256: createHash('sha256').update(html).digest('hex'),
  }
  cache.set(file, value)
  return value
}
const families = {}
for (const rec of report.urls) {
  const url = new URL(rec.url)
  const path = url.pathname
  const definition = findRouteDefinition(path)
  const policy = getRoutePolicy(path)
  rec.access = policy.access
  rec.content_quality = policy.contentQuality
  rec.ad_mode = policy.adMode
  rec.source_robots = policy.robots
  rec.source_indexable_candidate = policy.indexable
  rec.source_policy_authority = 'src/data/routeRegistry.mjs:getRoutePolicy/findRouteDefinition'
  if (definition && rec.family !== '/technical-probe' && rec.family !== '/host-variant') rec.family = definition.path
  rec.action_taken = definition?.path?.startsWith('/study-material/optional/') || definition?.path?.startsWith('/study-material/islamic-studies/')
    ? 'repaired_study_detail_metadata_and_structured_data_consistency'
    : path === '/grammar-course' ? 'prerendered_real_grammar_course_and_explicitly_enabled_indexing'
    : path === '/subjects/selector' ? 'repaired_subject_selection_correctness_preserved_noindex'
    : definition?.path === '/past-papers/:exam/:year' ? 'removed_repeated_archive_filler_preserved_paper_links'
    : 'audited_preserved'
  if (['/account', '/account/dashboard', '/account/tasks', '/account/progress', '/account/english', '/account/library', '/account/mpt', '/account/mpt/history', '/account/mpt/performance'].includes(path)) {
    rec.action_taken = 'disabled_manual_ads_on_management_navigation_and_focused_practice_preserved_access_noindex'
  }
  if (definition?.path === '/study-material/optional/:subject/:topic' || definition?.path === '/study-material/islamic-studies/:chapter/:topic') {
    rec.action_taken += ';stabilized_failed_content_download_without_automatic_retry_loop'
  }
  if (path === '/') rec.action_taken = 'repaired_ticker_motion_controls_and_countdown_accessibility_deferred_nonessential_entry_modules'
  families[rec.family] = (families[rec.family] || 0) + 1
  if (url.origin !== report.origin) {
    rec.local_artifact = { status: null, reason: 'Host redirect variants require real server HTTP verification; static resolver assumes preferred host.' }
    continue
  }
  const result = resolveRequest(rules, artifact, decodeURI(path))
  const details = result.file?.endsWith('.html') ? await inspect(result.file) : {canonical: null, robots: null, title: null, main_content_characters: null}
  const listed = sitemapUrls.has(rec.url)
  const html = result.file?.endsWith('.html') ?? false
  const indexable = html && result.status === 200 && !/noindex/i.test(details.robots || '') && details.canonical === rec.url
  let reason
  if (result.status === 404 || result.status === 410) reason = 'Unknown or nonexistent route: preserve genuine error status and noindex.'
  else if (result.redirect) reason = 'Consolidated equivalent legacy URL: preserve permanent redirect.'
  else if (!html) reason = 'Technical/resource response; independently evaluated from HTML page indexing.'
  else if (policy.access !== 'public') reason = 'Private/account/admin/hibernated surface; preserve authentication and noindex.'
  else if (papers.has(path) && !papers.get(path).indexable) reason = 'Document-access viewer lacks enough authentic recorded questions under existing content gate; preserve PDF access and noindex. This is a site policy, not a Google minimum.'
  else if (path === '/study-material/optional/pure-mathematics' && /noindex/i.test(details.robots || '')) reason = 'Existing real-content gate excludes this limited hub; preserve topics and access, review subject-level usefulness separately.'
  else if (/noindex/i.test(details.robots || '')) reason = `Existing ${policy.contentQuality} or rendered-content gate excludes this surface; evaluate functionality and value individually before changing.`
  else if (details.canonical !== rec.url) reason = 'Alternate path/query representation declares another equivalent canonical; keep canonical URL in sitemap.'
  else reason = 'Canonical public content remains eligible under final artifact gates; indexing and editorial accuracy still require independent evidence.'
  rec.local_artifact = { ...result, ...details, sitemap_presence: listed, intended_indexability: indexable, decision_reason: reason, verification: 'Static resolution of generated .htaccess and HTML; not an observed live HTTP response.' }
  rec.local_editorial_review = null
  if (result.status === 200) {
    const book = bookReviews.get(path)
    if (book) {
      rec.action_taken += ';added_shared_source_notes_and_reviewed_quotation_labels'
      rec.local_editorial_review = { status: book.quotationStatus, identity_status: book.identityStatus, source: 'docs/seo/editorial/book-quotation-review.json', limitation: 'Quotation evidence is separate from bibliographic identity, complete analysis verification and permissions.' }
    } else if (noteReviews.has(path)) {
      rec.action_taken += ';applied_exact_anchor_sourced_constitutional_update'
      rec.local_editorial_review = { status: 'bounded_sourced_update', source: 'scripts/editorial/optional-note-reviews.json' }
    } else if (path === '/journal') {
      rec.action_taken = 'added_six_accessible_archive_transcripts_printed_dates_and_six_separate_clarifications'
      rec.local_editorial_review = { status: 'archive_accessibility_and_bounded_clarifications', source: 'docs/seo/editorial/JOURNAL_REVIEW.md', limitation: 'Original archive claims and external permissions still need the specified reviews.' }
    } else if (path === '/css-2026-written-result') {
      rec.action_taken = 'verified_supplied_pdf_aggregate_and_added_corresponding_APP_source'
      rec.local_editorial_review = { status: 'aggregate_corroborated_official_remote_pdf_match_unavailable', source: 'docs/seo/evidence/css-2026-result-editorial-check.json' }
    } else if (path === '/gk/cat/english-grammar' || path === '/gk/cat/general-ability') {
      rec.action_taken += ';added_bounded_reviewed_explanations_preserved_access'
      rec.local_editorial_review = { status: 'bounded_question_review', source: 'docs/seo/MCQ_EDITORIAL_REVIEW.md', limitation: '56 reviewed questions, one documented key correction; no whole-bank factual certification or access change.' }
    }
  }
  if (definition?.path === '/vistagram/:slug' && result.status === 200) {
    rec.action_taken = 'restored_existing_public_article_direct_route_and_real_prerender_preserved_noindex_no_ads'
  }
  if (result.status === 404 && !definition) rec.action_taken = 'repaired_runtime_not_found_metadata_no_canonical'
  rec.intended_indexability = indexable
  rec.indexability_recommendation = reason
}
report.families = families
report.local_artifact = {
  inspected_at: new Date().toISOString(),
  artifact_directory: relative(root, artifact),
  routes_inspected: report.urls.filter(x => x.local_artifact.status !== null).length,
  sitemap_unique_urls: sitemapUrls.size,
  source_policy_authority: 'src/data/routeRegistry.mjs:getRoutePolicy/findRouteDefinition',
  production_fields_unchanged: 'status/final_url/canonical/robots/headers/sitemap_presence/http_observed remain baseline HTTP observations; local_artifact contains local build results.',
}
await writeFile(inventoryPath, JSON.stringify(report, null, 2) + '\n')
const fields = ['url','family','status','final_url','canonical','robots','x_robots_tag','sitemap_presence','intended_indexability','access','content_quality','http_observed','google_status','google_status_historical','google_status_historical_export_date','local_artifact_status','local_artifact_canonical','local_artifact_robots','local_artifact_sitemap_presence','local_artifact_intended_indexability','local_editorial_review_status','indexability_recommendation','action_taken']
const csv = value => value === undefined || value === null ? '' : `"${String(value).replaceAll('"','""')}"`
const lines = [fields.join(',')]
for (const row of report.urls) {
  const expanded = {...row, google_status_historical: row.google_status_historical?.status, google_status_historical_export_date: row.google_status_historical?.export_date_as_named, local_editorial_review_status: row.local_editorial_review?.status, ...Object.fromEntries(Object.entries(row.local_artifact).map(([k,v]) => [`local_artifact_${k}`,v]))}
  lines.push(fields.map(f => csv(expanded[f])).join(','))
}
await writeFile(join(root, 'docs/seo/URL_INVENTORY.csv'), lines.join('\n') + '\n')
await writeFile(join(root, 'docs/seo/evidence/artifact-inventory-summary.json'), JSON.stringify(report.local_artifact, null, 2) + '\n')
console.log(`Added local artifact observations for ${report.local_artifact.routes_inspected} URLs; ${sitemapUrls.size} unique local sitemap URLs. Production HTTP baseline preserved.`)
