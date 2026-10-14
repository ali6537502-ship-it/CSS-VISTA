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
