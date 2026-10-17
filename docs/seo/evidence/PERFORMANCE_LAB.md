# Bounded performance evidence — 14 October 2026

This is an instrumented **local artifact lab sample**, not field Core Web Vitals, production speed, or an AdSense eligibility score. No field INP, CrUX, PageSpeed Insights, hosting logs or real-user data was available for this verification. None is invented.

The six Chromium samples used fresh contexts, no CPU/network throttling, buffered LargestContentfulPaint and LayoutShift observers, CLS session windows, and a bounded 1.5-second observation after network-idle and font readiness. Local API calls and all external resources were blocked; a preview-only CSP also denied external scripts and fetch connections. That CSP is test infrastructure only and is **not a proposed production policy**. No production login, account mutation or advertising interaction occurred.

| Route | Viewport | Observed LCP | Observed CLS | Resource entries | Resource transfer bytes |
| --- | --- | ---: | ---: | ---: | ---: |
| Home | 390 × 844 | 836 ms | 0 | 23 | 895,192 |
| Optional financial-accounting topic | 390 × 844 | 900 ms | 0.0490 | 26 | 900,502 |
| Eligibility calculator | 390 × 844 | 1,116 ms | 0 | 21 | 915,561 |
| Home | 1440 × 900 | 1,020 ms | 0 | 23 | 895,192 |
| Optional financial-accounting topic | 1440 × 900 | 1,008 ms | 0.0211 | 26 | 900,502 |
| Eligibility calculator | 1440 × 900 | 932 ms | 0 | 21 | 915,561 |

Evidence: `browser-performance-lab.json`. No page JavaScript exceptions or document overflow were observed. Network timings are loopback measurements. Resource transfer totals come from PerformanceResourceTiming; they exclude the navigation document and blocked/unobservable requests. These samples do not establish a Core Web Vitals pass or predict production timings.

## Lighthouse mobile sample

`lighthouse-local-mobile.json` records Lighthouse 13.5.0 on the local home page, with default mobile simulation (150 ms RTT, 1,638.4 Kbps throughput setting, 4× CPU slowdown). The local resolver does not model Hostinger compression, CDN, cache response headers, backend, or real advertising. The isolated run had **zero successful external requests and zero API network requests** in its network audit.

- Performance score: **51/100**, within this local simulated setup only.
- Simulated LCP: **7.05 s**; FCP **5.96 s**; Total Blocking Time **424 ms**; CLS **0**.
- Main bundle reported about **171 KiB unused JavaScript** during this one home-page trace. This is a future performance investigation candidate, not proof the code is unused across the application.
- The strict Vite build's existing **chunks larger than 500 kB** warning remains relevant. Large educational data chunks are mostly route-loaded; they are not all transferred on every page. Measured artifact examples include the general-knowledge chunk (2,643,061 bytes), vocabulary (1,180,411), grammar course (669,622), and main index bundle (549,125). Preserve functioning libraries while considering measured route-specific splitting separately.
- Lighthouse accessibility findings include a small/overlapping live-ticker/streak target and a countdown link whose accessible name does not contain all visible dynamic text. Those need a focused mobile/accessibility review; no interface redesign was attempted.
- The SEO and best-practices aggregate scores are **not production assessments**: Lighthouse could not fetch robots.txt because the test CSP intentionally denies fetch connections, and console security errors reflect intentional API/ad blocking. The artifact's robots.txt itself remains the separately audited valid production text.

An initial Lighthouse attempt was discarded because its CLI URL-block pattern did not suppress remote advertising subresources. The retained sample uses CSP network isolation, and its request audit confirms the intended isolation. It must not be compared numerically with that discarded attempt.

Reproduce after building the artifact:

```sh
npm ci --prefix tests/browser --ignore-scripts
node tests/browser/seo-performance.mjs
```

Optional Lighthouse uses a separately installed CLI, outside the application dependencies:

```sh
CSSV_LIGHTHOUSE_CLI=/path/to/lighthouse node tests/browser/seo-performance.mjs
```

The scripts write `test-artifacts/seo-performance.json` and optional `test-artifacts/lighthouse-local-mobile.json`. Repeat a production lab test and consult field data after deployment is explicitly authorized; investigate meaningful differences before changing resource delivery. Do not treat blocked preview APIs, simulated delay, or slow Google reprocessing as confirmed live defects.

### Final isolated lab continuation

The final six fresh-context samples load real public study JSON. The preview permits only that public content, the homepage feed and robots fetch; external resources and account APIs remain denied. The final request audit confirms zero external successful requests and zero API network requests. Notes now have CLS 0.0261 on mobile and 0 on desktop; home/calculator are 0 at both widths. No page errors or overflow were observed. These loopback samples do not establish field CWV or INP.

Lighthouse 13.5.0 mobile homepage scores are performance 52, accessibility 100, SEO 100 and best-practices 92. Simulated LCP is 6.978 seconds, TBT 413 ms and CLS 0. Production already compresses HTML; this uncompressed preview does not model Hostinger/CDN/advertising/backend delivery. No field improvement percentage is claimed. The smaller 480,144-byte entry defers metadata indexes and the closed profile panel; large route-specific education chunks remain. Expected API-blocking CSP console errors affect the preview's best-practices result and are not diagnosed as live faults. The original mobile control/naming findings are repaired and covered by browser assertions.

See [final performance JSON](browser-performance-autonomous-final.json), [final Lighthouse](lighthouse-autonomous-final.json) and [failed-download regression evidence](browser-autonomous-final.json). Initial blocked-content layout shifts and discarded isolation attempts are separately preserved; they cannot be presented as normal real-user behavior.
