# MPT Examination System — Phase 0 Audit

Audited revision: `0bbe72c` (25 September 2026). Read-only; no code was changed
to produce this report. Line references are to that revision.

---

## 1. Backend & data

### 1.1 What backend exists

| Layer | Status | Evidence |
|---|---|---|
| **PHP 8.1+ same-origin API** (`/api/*.php`), one file per endpoint, PDO, no framework/Composer | **Live** | `public/api/`, copied by Vite into `dist/api/`; `HOSTINGER_DEPLOYMENT.md:33` |
| **MySQL 8 / MariaDB 10.11**, InnoDB, utf8mb4, UTC sessions | **Live** | `public/api/_bootstrap_core.php:74-109`; `server/sql/001…009` |
| Private config (`CSSV_DB_*`, `CSSV_APP_SECRET`, `CSSV_PRIVATE_STORAGE_DIR`, SMTP) outside webroot | Live | `server/config/config.example.php`; `_bootstrap.php:7-151` |
| Supabase (Postgres) | **Retired** 13 Sep 2026 (PR #21) | `docs/hostinger-account-cutover.md:5-8`; `auth/supabase-session.php` → 410 |
| `drizzle/` | Unused leftover (empty sqlite journal) | `drizzle/meta/_journal.json` |
| `hosting-migration/mysql-schema.sql` | Planning document, not the deployed schema | — |
| Node server | **None.** Node runs only at build time on Hostinger | `HOSTINGER_DEPLOYMENT.md:9-16` |

Deployment: Hostinger Git deploy from `main` → `npm install` → `npm run build:hostinger`
→ publish `dist/` (which includes `dist/api/*.php`).

**Conclusion for Section 2 gap analysis:** a trustworthy server layer **does exist**
(authenticated PHP + MySQL with transactions). No new hosting is needed; the MPT
services will be new PHP endpoints and new MySQL tables following the existing
conventions. The Phase-0 "propose two hosting options" branch does not apply.

### 1.2 Accounts and session validation

- Accounts: MySQL `users` (UUID `CHAR(36)` id, email, password hash) + `student_profiles`
  (`server/sql/001:10-76`). 202 migrated accounts, all working natively.
- Session: opaque 48-byte token in HttpOnly cookie `cssv_session`; HMAC-SHA256 hash
  stored in `auth_sessions` with UA hash + IP /24 hash, 14-day expiry
  (`_bootstrap_core.php:219-284`).
- `cssv_require_user($pdo, $requireCompleteProfile = true)` (`_bootstrap_core.php:286-299`)
  → 401 if no session; 409 if the `X-CSSV-User` header mismatches; 403
  `profile_incomplete` unless all 12 mandatory profile fields are saved (`_profile.php`).
- CSRF: double-submit `cssv_csrf` cookie + `X-CSRF-Token` header verified against
  `auth_sessions.csrf_hash` (`cssv_require_csrf`, `:359-366`); `account_require_json_origin()`
  checks `Origin` (`_account_auth.php:44-49`).
- **Admin:** a separate owner-only login with password + TOTP
  (`public/api/_admin_auth.php`, tables `admin_accounts`, `admin_sessions`), checked by
  `cssv_require_separate_admin()` / `native_owner()` (`_native_admin.php:5-11`), with owner
  CSRF. The legacy `admin_users` / `cssv_require_admin` path is unused.
- Rate limiting: `cssv_enforce_rate_limit()` counts rows of `login_security_events`
  per event type within a window, keyed by email hash **or** IP /24 hash
  (`_bootstrap_core.php:200-217`). Reusable as-is for apply/verify/start/submit.
- Audit logging: only security events (`cssv_log_security_event`, `:185-198`). There is no
  general append-only domain event log.

### 1.3 Where MPT data lives today

**There are no MPT tables.** No mock, paper, schedule, window, application or
leaderboard exists server-side.

| Item | Where | Notes |
|---|---|---|
| Question shape | `BankQuestion` `src/data/mcq.ts:9-19` | `{id, q, o[4], a (correct 0-3), e?, s? topic, d? difficulty, paperSection?}` |
| Question pools | `public/mcq/*.json` (132 shards, 36,245 q), `src/data/mock-bank.json`, `public/css-subject-mcqs/general-science-and-ability.json`, ~15 bundled TS banks (`src/data/mockPapers.ts:1-19`) | All public, all contain `a` |
| Quality/eligibility gates | `src/data/mptQuality.ts` | |
| Legacy exclusion list | `src/data/mptLegacyIds.json` (6,819 ids) | built by `scripts/build-mpt-legacy-exclusions.mjs` |
| Results | MySQL `quiz_attempts` (`server/sql/001:103-119`) | populated from the client's localStorage via `student/progress.php:111-129` |
| Per-question events | MySQL `question_attempts` | **skipped** for `mock-*` ids (`GKQuiz.tsx:611,671`) |

### 1.4 How a paper is generated and scored

- **Generator:** `buildCompetitiveMock(kind, sessionDateKey, studentName)`
  (`src/data/mockPapers.ts:546-604`) — runs **in the browser**. Loads pools, excludes legacy
  ids and questions this *typed name* has already seen in this browser, selects each
  section by quality score then `stableHash('mpt|' + dateKey)`, enforces topic cap and
  near-duplicate filters, shuffles options deterministically, validates, saves to
  localStorage.
- **Blueprint** (`mockPapers.ts:416-422`): Islamic Studies 20 · Urdu 20 · English 50 ·
  General Abilities 60 · General Knowledge 50 = **200 questions, 200 minutes**
  (`timeSec: 200 * 60`, `:559,584`).
- **Release gate:** `npm run audit:mpt-release` (runs as `prebuild`) simulates 40
  sequential papers (20 days × 2 slots, `scripts/audit-mpt-40-papers.mjs:54-58`) plus the
  factual audit. Build fails if they fail.
- **Scoring rule** (`src/pages/gk/GKQuiz.tsx:527`):
  `score = qs.filter(x => answers[x.id] === x.a).length` → **1 mark per correct answer,
  no negative marking, no pass threshold in code.** (The 33 % figure in
  `src/data/mptSyllabus.ts:33-35` is descriptive text about the real FPSC MPT only.)
  Section breakdown uses `paperSection` (`GKQuiz.tsx:737-741`).
- Practice quizzes on `/mpt` (`QuizEngine.tsx:150`) have an optional −0.25; this is **not**
  used by the mock.

### 1.5 Integrity findings (critical)

| # | Finding | Severity |
|---|---|---|
| C1 | **Answer keys ship to the browser.** Every mock question carries `a`, and the assembled paper, keys included, is written to localStorage (`src/lib/mptMockHistory.ts:60-68`). | Critical |
| C2 | **Scoring is 100 % client-side**; the server stores whatever `{score,total}` the client reports and only checks `0 ≤ score ≤ total` (`progress.php:120`). | Critical |
| C3 | **The paper is predictable.** Selection is seeded by the public date key and runs from public code + public pools, so anyone can build tomorrow's paper, with keys, in a browser console. | Critical |
| C4 | Candidate identity for the mock is a **free-text name** (`GKQuiz.tsx:319-372`), not the account. | High |
| C5 | `/gk/quiz` has **no `ProfileGate`** (`App.tsx:170`); the exam is reachable anonymously. | High |
| C6 | The question pools used for the mock are the same public practice banks. Even with a server-held key, a candidate could look up a question's answer in `public/mcq/*.json`. | Medium (residual; see DECISIONS D-07) |

---

## 2. Frontend & routing

- Router: `react-router` v7 declarative `<Routes>` in `src/App.tsx:110-208`, one layout
  route; pages lazy-loaded via `lazyWithRecovery`, each wrapped in `<S>` (Suspense).
- Route policy: `src/data/routeRegistry.mjs` (`publicPage` / `protectedPage` helpers,
  `ROUTE_REDIRECTS`, `getRoutePolicy` fails closed). App routes and the registry are kept
  in step by hand.
- Guard: `ProfileGate` (`src/components/ProfileGate.tsx:21-24`) → redirects to
  `/account?returnTo=…` and enforces profile completion. `safeReturnTo` accepts
  same-origin paths only (`src/features/current-affairs/model.ts:107-109`).
- Prerender: only `PRERENDER_ROUTES` (`scripts/prerender/routes.tsx:116-168`) get real
  rendered content; no account/admin/quiz route is prerendered. Every exact registry route
  gets a meta-only shell at `seo/routes/*.html`; pattern routes need a hand-written
  `.htaccess` rule to `seo/routes/protected.html` (`public/.htaccess:142-147`). Unknown
  URLs hard-404 (`:151-154`). `/account` and `/api/` get `X-Robots-Tag: noindex, nofollow`.
- API client: `src/lib/hostingerApi.ts` (`hostingerRequest`, sets `X-CSSV-User` and CSRF).
  Auth context: `src/components/AccountProvider.tsx`, `useAccount()`.

### MPT pages

| Piece | File | Route |
|---|---|---|
| Public MPT hub | `src/pages/MPTPrep.tsx` | `/mpt` (public, indexable, prerendered, adMode disabled) |
| Subject banks | `src/pages/MPTQuestionBank.tsx` | `/mpt/bank/:bankId` (authenticated) |
| Registration + runner + timer + result | `src/pages/gk/GKQuiz.tsx` | `/gk/quiz` |

### Dashboard & design system

- My CSS Vista: `src/pages/AccountHome.tsx` (`/account/dashboard`), a `ChoiceCard` grid plus
  "Pick up where you left off"; sub-pages use `AccountPage` from
  `src/pages/account/shared.tsx:101-133` (also `Metric`, `EmptyNote`, `SectionTitle`).
- Tokens: `src/index.css:490-510` (`--primary` pine green `153 63% 15%`, `--accent` gold
  `45 70% 46%`, `--background` cream). Pages use raw Tailwind (`emerald-*`, `slate-*`,
  `bg-pine`). A full shadcn set exists in `src/components/ui/` but pages hand-roll markup.
  There is no StatusBadge component and no central copy file.
- Admin: `/sadiaali` (`src/pages/admin/Admin.tsx`, workspaces; `AdminPanel.tsx` tabs).
- Feature flags: **no mechanism exists.**
- Tests: `node --test tests/*.test.ts` (Node 22 strips types; imports need explicit
  extensions, no `@/` alias). PHP integration tests run in CI against a MySQL 8 service
  (`.github/workflows/current-affairs-verification.yml`) with `php -S` and Node `fetch`
  scripts, guarded to `CI=true` + a disposable DB name.

---

## 3. Schedule & legacy

- **Schedule is hardcoded** in `src/lib/store.ts:33-41, 489-535`. It runs **every day**:
  - afternoon MPT: registration 15:00–17:00 PKT (`?slot=afternoon`)
  - evening MPT: registration 22:30–24:00 PKT (`?slot=evening`)
  - A candidate may **start any time inside the 2 h / 1.5 h window** and always gets the
    full 200 minutes. "One attempt per slot per day" is enforced only in that browser's
    localStorage (`recordScheduledMock`, `store.ts:561-577`).
- Historical results: `quiz_attempts` rows reliably linked by `user_id` exist **only for
  signed-in users who synced**. Their scores are client-reported (C2). Both slots record
  `mockKind: 'mpt'` (`GKQuiz.tsx:683`), so slots cannot be distinguished; `category` holds
  the title. No roll numbers or applications exist to migrate.

### Direct-entry URLs to close (Section 16)

1. `/gk/quiz?mode=mpt-mock&slot=afternoon` (`MPTPrep.tsx:125,167`, `store.ts:525`)
2. `/gk/quiz?mode=mpt-mock&slot=evening` (same)
3. `/gk/quiz?mode=mpt-mock` (defaults to evening; `account/Progress.tsx:65`,
   `ExamIntelligence.tsx:225`)
4. Links rendering these: Home "Today's mock windows" (`Home.tsx:417-441`), the Layout
   notification bar (`Layout.tsx:269-281`), `/mpt` mock cards.

`mode=pms-mock` / `mode=one-paper` / `/five-minute` are not MPT and stay unchanged.

---

## 4. Gap analysis → architecture

| Need | Gap | Approach (details in DECISIONS.md) |
|---|---|---|
| Server-held paper + key | Paper is generated client-side in TS; server is PHP | **Build-time export.** The build runs the existing generator (same code, same release audit) for upcoming mocks with a **secret seed** and writes key-bearing papers as non-public PHP data files. When a mock is published, the server **freezes** the paper into MySQL. The browser only ever receives a paper without keys. (D-03, D-04) |
| Server scoring | Only client scoring | Port the one-line rule (1 mark per correct, `negative_marking = 0` configurable) to PHP; parity test with the TS rule on identical answers. (D-05) |
| Mocks as records | Hardcoded daily windows | `mpt_mocks` + `mpt_sessions`; admin creates mocks, with a "generate from the existing daily schedule" helper. (D-01) |
| One state engine for server + UI | Different languages | PHP is canonical; a TS mirror handles countdown transitions. Both run one shared JSON fixture table. (D-06) |
| Scheduled jobs | Only the mail cron exists (and is not configured remotely) | CLI sweeper for Hostinger cron **plus** opportunistic sweeping on every MPT API call, so results exist without cron. (D-09) |
| Feature flag | None | Server config `CSSV_MPT_APPLICATION_FLOW` = `off` / `pilot` / `on` + pilot allowlist, exposed by `GET /api/mpt/config.php`. (D-10) |
| Append-only audit log | None | New `mpt_events` table, insert-only. |

---

## 5. Phased plan (maps to Sections 4–21)

| Phase | Deliverable | Sections |
|---|---|---|
| 1 | `server/sql/010_mpt_exam_system.sql` (+ rollback), `public/api/_mpt*.php` services (apply, application read, verify, start, save, submit, sweeper), roll number + Damm check digit, signed verification token, paper export script + freeze, PHP scoring, state engine (PHP + TS) with shared fixtures, CI integration test against MySQL. Flag default `off`. | 5, 6, 7, 8, 10, 16 |
| 2 | Candidate UI under `/account/mpt/…`: apply, confirmation with reveal countdown, application detail/print/withdraw, entrance gate, verified screen; `/mpt` CTAs; registry + `.htaccess` + App routes | 11–14, 19 |
| 3 | Exam runner wired to server paper (reuse `GKQuiz` question UI), server timer, autosave/offline queue, resume, device takeover, auto-submit, result page | 9, 10 |
| 4 | Dashboard MPT hero card, score, performance, history, upcoming; `mpt_user_stats` | 15, 20 |
| 5 | Admin workspace: mocks, applications (CSV), attempts, statistics, void/re-sit, rescore | 18 |
| 6 | Rate-limit tuning, a11y/mobile QA, Lighthouse, legacy redirects for `mode=mpt-mock`, flag `on`, `TEST-REPORT.md`, `RUNBOOK.md` | 16, 17, 21, 22 |

## 6. Risks

1. **R1: Paper leakage via public pools (C6).** Hiding the key on the official paper does
   not stop a candidate from searching `public/mcq/*.json` for the question text. Fixing
   this means withholding mock-eligible questions from public practice banks. That is a
   product change and is out of scope unless the owner asks for it.
2. **R2: Paper supply depends on deploys.** Papers are exported at build time. If nobody
   deploys for longer than the export horizon, there are no new papers to publish. The
   admin UI will show "no paper available" and refuse to publish rather than improvise.
3. **R3: Secret seed on Hostinger.** The build needs `CSSV_MPT_PAPER_SEED` in the Hostinger
   build environment (not a `VITE_` variable). Without it the export must fail closed for
   production. CI and local builds use an explicit non-production seed and mark those
   papers as not publishable.
4. **R4: No cron configured today.** Opportunistic sweeping covers correctness, but rank
   and percentile computation is delayed until the next MPT API request after
   `exam_end_at`.
5. **R5: Product change to the daily mocks.** Today candidates start whenever they like
   within a 1.5–2 h window and always get 200 minutes. Section 1A replaces this with a
   fixed start, entry closing at +10 min, and a common hard end. This follows the locked
   decisions but changes what current students are used to.
6. **R6: Shared hosting limits.** PHP request timeouts are relevant to the rescore job for
   large mocks. Rescore will run in batches and can be resumed.
7. **R7: No local MySQL in the dev container.** Server integration tests run in CI (MySQL
   service), following the existing pattern. Pure logic (roll numbers, state engine,
   scoring, timing) also gets fast unit tests that need no database.
