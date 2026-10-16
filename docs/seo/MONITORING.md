# Release and monitoring runbook

The scoped SEO release is owner-authorized; actual deployment evidence and time are recorded in [verification](VERIFICATION.md). Monitoring intervals are relative to that verified release. No Google submission or indexing/approval outcome is implied by a passing public monitor.

## Before release

Run `npm run typecheck`, `npm run lint`, `npm run test:all`, `npm run audit:editorial`, `npm run build:hostinger:strict`, `npm run test:routes`, `npm run audit:routes`, `npm run audit:links`, `npm run audit:duplicates`. Preserve the logs and Git revision. Use the existing GitHub-to-Hostinger workflow under the scoped authorization; preserve Pro, MPT, AI, paid activation and private-draft restrictions.

Record the exact AdSense rejection and Search Console reports described in [Google account actions](GOOGLE_ACCOUNT_ACTIONS.md). Archive this audit's inventory separately when re-running: `python3 scripts/seo/crawl-production.py --output docs/seo/post-release/day-0`.

## Deployment day

Verify `/deployment-fingerprint.json?expected=<release-sha>` with cache bypass headers; compare `gitSha` with the intended release, `buildTarget`, and `builtAt`. The SHA represents committed source: do not treat an uncommitted local build bearing the old HEAD SHA as a deployed fix. Probe raw HTML, hydrated metadata, unknown-route 404, public asset access, ads.txt, verification and all sitemap children. Check cache headers/Hostinger CDN for stale HTML. Compare the real book source note, both constitutional updates, six Journal texts/six clarifications and corrected English answer/explanation. Public HTML currently revalidates after 300 seconds and ordinary JSON after 3,600 seconds; existing premium payloads remain no-store. Verify both bypassed and revalidated responses rather than assuming a new deployment immediately removes every cache entry. Do not clear student data or change private access to make a probe pass.

## Monitoring intervals

| When | Checks | Response |
| --- | --- | --- |
| Day 7 | Sitemap last read/errors; response codes; sampled URL inspection crawl dates/canonicals; errors and mobile paths; exact AdSense status if reviewed | Fix observed regressions. Distinguish an unchanged indexed snapshot predating release from a failed live response. |
| Day 14 | Compare dated Page Indexing reason counts, important-URL sample, Crawl Stats and matched performance periods | Investigate persistent eligible-page exclusions using actual content, duplication and discovery evidence. Do not repeatedly rewrite or resubmit unchanged pages. |
| Day 28 | Repeat inventory sample, compare indexed canonicals and important exclusions, impressions/clicks with filters, field CWV if available and AdSense findings | Escalate unresolved families to a targeted editorial or server investigation. Continue monitoring when Google's reprocessing is incomplete. |

The current baseline of Google-known URLs, indexed canonicals, exclusion counts, clicks and impressions remains **unavailable** until account exports/authorized integration work. Historical September notifications and the August/September issue export are recorded separately in [account evidence](GOOGLE_ACCOUNT_ACTIONS.md). Record actual counts and dates without estimating percentages. Keep intentional exclusions separate from recoverable errors. A lack of immediate indexing is not proof of a technical failure; eligibility, content usefulness and Google's selection remain different questions.

## Prevention ownership

Engineering owns route/metadata/rendering/asset and build gates. The editorial owner verifies quotations, book/cover rights, article authorship, dated sources and examination guidance. The account owner verifies consent and ad exclusions and approves submissions. Keep each issue's evidence, decision, validation and owner together; do not add mass-generated pages to increase an index count.

## Automated public sampling

`.github/workflows/seo-monitoring.yml` runs Fridays at 12:00 UTC and supports manual dispatch. For a Friday 16 October release, checks cover 23 October, 30 October and 13 November (7/14/28 days), plus intermediate weeks. It uses the current default-branch SHA and preserves a dated JSON artifact for 35 days. Inspect failures in GitHub Actions; the workflow does not message other people or change account settings.

`python3 scripts/seo/monitor-production.py --expected-sha <release-sha>` reuses the existing crawler and checks robots, existing publisher ads.txt, all sitemap children/duplicates, 24 fixed/rotating public canonical pages, two anonymous account shells and a genuine missing URL. It verifies title/H1/main presence without imposing a Google word count, canonical/noindex consistency, JSON-LD and route-specific initial advertising eligibility. Crawls use three workers and bounded responses. This is technical sampling, not a full live crawl, Googlebot simulation, account inspection or proof of indexing. Complete the separate portal checks at each interval when access is available.
