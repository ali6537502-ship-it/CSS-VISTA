# Private Pro accessibility checks

14 October 2026. Development candidate only. Pro remains paused; this work does not authorize a merge, deployment, payment collection, AI activation or topic publication.

## Audit and focused fixes

The previous candidate had native functional and responsive browser coverage but no dedicated WCAG scan or keyboard-return check. The isolated built interface exposed low-contrast shared progress headings and inactive mobile navigation labels. `shared.tsx` and `Layout.tsx` now use the existing darker slate color without changing navigation, curriculum or account policy.

The original study-streak overlap report was traced to the ticker: later theme CSS overrode the earlier reduced-motion rule. Actual hit testing showed that the clipped neighboring link was not blocking the streak; the trial streak-size change was reverted. The final reduced-motion rule now wins after the theme CSS and stops the ticker transform. Normal motion and announcements remain available. The named ticker container also receives the appropriate group role.

`Layout` already supplies the primary main-content landmark. The account dashboard and shared account wrapper now use neutral div wrappers instead of adding nested main landmarks. Headings, classes, layouts and content remain intact. The shared wrapper continues serving existing free account pages.

The desktop account-menu accessible name now includes the visible “My Account” label. A real keyboard regression showed that Escape hid the menu without returning focus to its trigger. Further tracing found that the notification widget unconditionally focused its bell on Escape, even while closed. `NotificationCenter.tsx` now restores focus only when its own controls/panel own it; scoped account-menu refs return focus to the existing account trigger. Escape in a writing field preserves that field's focus, and closing the actual notification panel still returns to its bell. No authentication or navigation actions are added.

## Verification

The test-only browser package pins `axe-core` 4.14.0; it is not imported into the student application or shipped in the public build. `tests/browser/accessibility.mjs` requires the isolated database and loopback origin, signs in through native authentication, and creates only synthetic owned preparation/writing data.

The suite checks the following real interface states:

- Free and Pro dashboard views; Expression, Précis, General Ability, Handwriting, Ask VISTA, Preparation, Progress, AI Usage and Membership.
- Guided and saved response states for Sentence, Argumentation, Analysis and Essay.
- Exact stored mathematical grading and saved feedback at 320, 390, 768 and 1440 pixels, including overflow checks.
- Desktop dashboard and open account menu, keyboard Tab entry and Escape focus recovery.

It runs WCAG A/AA rules including WCAG 2.1/2.2 rules, plus single/top-level main-landmark checks. Native radio arrows/Space, textarea-to-save Tab/Enter, numeric answer entry/Tab/Enter and account-menu keyboard actions are tested. The reduced-motion preference must actually stop the ticker. Native usage snapshots must remain unchanged; scans and fixed exercises make no AI requests.

Raw violations and incomplete/manual-review results are retained in ignored `test-artifacts/accessibility.json`. Rules are not disabled and detected violations are not discarded. Gradient backgrounds can require manual contrast assessment; a zero automated-violation result is not a claim of complete accessibility certification or testing with a physical screen reader. Genuine AI/OCR academic review remains a separate unfinished task.

The initial audit findings and actual Escape-focus failure were corrected. Two test assumptions were also corrected: essay selection now uses the actual catalogue, and General Ability handles both numeric and choice exercises. Those initial runs are not described as successful. Final local and exact-head CI results are recorded in the draft PR and private release report.

## Preservation and release bounds

No course text, answers, grade logic, student/mentor rows, subscription duration/price, source identities, feature limits, production configuration or account permissions are changed. The generated unrelated Vistagram timestamp is restored. Existing native and built student regression checks continue in Pro CI, with this accessibility journey added afterward. No production testing or real provider work is claimed. Real model/image validation, host cleanup evidence, pending launch decisions and the explicitly deferred CA/PA collection remain outstanding.

## Rendered contrast follow-up — 15 October

Completed a separate review of the incomplete contrast findings on the same isolated built interface. Run the optional measurement mode with the established native runtime:

```sh
CI=true CSSV_DB_NAME=cssvista_briefing_test CSSV_TEST_CONTRAST_REVIEW=1 node tests/browser/accessibility.mjs
```

Use the existing PHP-container/browser selectors when required by the local environment. This mode is restricted to loopback/reference pages. `contrast-review.mjs` records text ranges and computed foreground colors, temporarily makes glyph paint transparent, captures the real rendered background and restores the paint override. It preserves CSS colors/currentColor backgrounds and layout. It calculates WCAG relative luminance/contrast over sampled text rectangles, including foreground alpha, with the separate normal/large-text thresholds. Unsupported group opacity, filters, shadow, clipping and occlusion remain explicitly unresolved rather than being given a passing result. This is a conservative rendered-sample assessment; it is not physical assistive-technology testing or certification.

Actual local result: 117 finding reviews across 25 interface states. Of these, 87 complete visible-text measurements passed (lowest ratio 5.2012:1); 25 ticker reviews passed only for their visible clipped portion and explicitly leave offscreen text unmeasured. One link was obscured by the open account menu; after the menu finished closing, the same link passed at 10.3547:1. Four low-reading findings were the clock's purely decorative middle dot, not instructional text. Its span is now explicitly hidden from screen readers, while status text and the semantic time remain unchanged; the review records a decorative classification, not a fabricated numerical pass. No meaningful text is waived merely because it is aria-hidden.

Raw incomplete findings remain in `test-artifacts/accessibility.json`, alongside the measurements and menu-closed follow-up. Nothing is suppressed from axe. Initial measurements revealed the decorative case; an initial follow-up also ran before the menu's closing transition completed, so it now waits for actual hidden visibility rather than an arbitrary delay. No new palette or interface redesign was needed.

Six browser reference tests validate black/white 21:1, a known low-contrast failure, large-text thresholds, alpha compositing, currentColor background preservation, safe unresolved states and the explicitly partial ticker/decorative classifications. These fixtures test the measurement method; they are not student results. The reference tests run in Pro CI; the more expensive full rendered review stays an explicit local mode. The full 25-state native/keyboard/accessibility run and six reference tests passed locally with unchanged AI usage. Final exact-head CI evidence is recorded in the draft PR and private release report.
