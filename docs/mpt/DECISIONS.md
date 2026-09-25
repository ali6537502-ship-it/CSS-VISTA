# MPT Examination System — Decisions

Every default and trade-off chosen while building the MPT application flow. The
Section 1A locked decisions in the master command override anything here.
Entries marked **OWNER** need the site owner's confirmation. Until they confirm,
the stated default applies.

Status key: `accepted` (engineering default, reversible) · `OWNER` (awaiting confirmation).

---

## Architecture

**D-01 · Mocks are database records, created by the admin** — OWNER (schedule)
Today the schedule is hardcoded: two MPT windows every day, 15:00 and 22:30 PKT
(`src/lib/store.ts:489-501`). Under the new system each official mock is an `mpt_mocks`
row with its own application window. The admin screen offers **"Create from daily
schedule"**, which fills in the existing 15:00 / 22:30 slots for a chosen date range. By
default nothing is created automatically. *Owner question:* keep two official mocks a day,
each needing its own application, or schedule fewer official mocks (for example weekly)?

**D-02 · Exam parameters come from the existing engine** — accepted
Defaults: 200 questions, 200 minutes, 1 mark per correct answer, no negative marking
(`negative_marking = 0`), no pass percentage (`pass_percentage = NULL`, so pass/fail is
hidden). All of these are per-mock settings. The 33 % in `mptSyllabus.ts` describes the
real FPSC MPT and is not applied automatically.

**D-03 · One paper per mock, the same for every candidate** — accepted
Fair ranking and a server-held key both need a shared paper. The official papers exclude
each other's questions, which is the property the 40-paper release audit already checks.
The old per-typed-name "no repeat" localStorage rule is not used for official mocks. The
existing engine has no per-candidate question shuffle, so `question_order` stays `NULL`.
Option order is the engine's deterministic shuffle.

**D-04 · Papers are exported at build time and frozen at publish** — accepted
- A new build step reuses `buildCompetitiveMock` and passes the same release audit. It
  exports upcoming papers to `dist/api/_mpt_papers/<paper_ref>.php`, each returning a PHP
  array.
- Those files are blocked by `.htaccess` (`[F]`). They also emit nothing if executed.
- The selection seed mixes a build secret `CSSV_MPT_PAPER_SEED` (a Hostinger build
  environment variable, **not** `VITE_`) with the date key, so the paper can no longer be
  rebuilt from public code (fixes AUDIT C3).
- Without the secret, the export produces papers marked `publishable: false`, and the
  server refuses to publish them.
- When the admin publishes a mock, PHP copies the paper and its key into
  `mpt_mock_questions`. From then on, a later deploy or generator change cannot alter a
  published paper.

**D-05 · Scoring runs server-side in PHP** — accepted
PHP port of `GKQuiz.tsx:527`: `score = count(selected === correct) − negative_marking ×
incorrect`, never below 0. The section breakdown uses `paperSection`, the only reliable
subject metadata. A parity test scores identical answer sets through the TS rule and the
PHP rule.

**D-06 · State engine: PHP is canonical, with a TS mirror** — accepted
The command asks for one function shared by server and UI. The server is PHP and the UI
is TS, so:
- `mpt_candidate_state()` in PHP decides every server rule and is returned with each read.
- `getCandidateMockState()` in TS (`src/lib/mpt/state.ts`) re-derives the phase locally,
  only so countdowns can flip at their boundaries without a reload. At each boundary it
  re-fetches from the server.
- Both run the same fixture table, `tests/fixtures/mpt-state-cases.json`. This covers
  every row, plus exact and ±1 s boundaries and the three reveal cases.

**D-07 · Residual risk: answers in the public practice banks** — OWNER (accept for now)
Mock questions also appear, with answers, in public practice JSON (AUDIT C6). Removing
them would change the practice features, so this is out of scope by default.

**D-08 · Private candidate screens live under `/account/mpt/…`** — accepted
The command suggests `/mpt/{mock}/entrance`. The account area already carries noindex
headers, `ProfileGate` and the My CSS Vista shell, so the private routes go there.
`/mpt` itself is unchanged apart from its CTAs (site-structure rule).

| Route | Purpose | access | contentQuality | indexable/sitemap | adMode |
|---|---|---|---|---|---|
| `/account/mpt` | MPT area: current mock, score, performance, history, upcoming | authenticated | private | no/no | enabled |
| `/account/mpt/apply/:mock` | application screen | authenticated | private | no/no | disabled (transaction) |
| `/account/mpt/applications/:code` | confirmation + application detail + print | authenticated | private | no/no | disabled (sensitive: roll number) |
| `/account/mpt/entrance/:mock` | roll-number gate + verified screen | authenticated | private | no/no | disabled (assessment) |
| `/account/mpt/exam/:mock` | exam runner | authenticated | private | no/no | disabled (assessment) |
| `/account/mpt/results/:code` | result | authenticated | private | no/no | enabled |
| `/account/mpt/history` | history | authenticated | private | no/no | enabled |
| `/account/mpt/performance` | performance | authenticated | private | no/no | enabled |

`:mock` is the public slug (for example `mpt-mock-031`). `:code` is the application code.
Raw database IDs never appear in URLs. Pattern routes get explicit `.htaccess` rules to
`seo/routes/protected.html`. None of these routes is prerendered.

**D-09 · Scheduled jobs: cron plus opportunistic sweep** — accepted
- `server/bin/mpt-sweep.php` handles auto-submit, absent marking and rank/percentile. It
  is meant to run from Hostinger cron every minute.
- No cron is configured today, so every MPT API request also runs a bounded, idempotent
  sweep for the affected mock (at most 50 attempts per call). The sweep uses an advisory
  `GET_LOCK` so concurrent requests do not double-process.
- Correctness does not depend on cron. Only the timeliness of rank and percentile does.

**D-10 · Feature flag `CSSV_MPT_APPLICATION_FLOW`** — accepted
The flag lives in private server config with values `off` (default), `pilot` or `on`.
`pilot` admits only the accounts in `CSSV_MPT_PILOT_EMAILS`. That is how "enable for
admins" works, because the owner admin is a separate login rather than a student account.
`GET /api/mpt/config.php` exposes only `{enabled: bool}` for the current user. With the
flag `off`, the site behaves exactly as today.

## Candidate identity & codes

**D-11 · Reuse the existing profile gate** — accepted
All student services already require the 12-field profile on the server
(`cssv_require_user`). Apply uses the same gate, and the UI shows the existing
`StudentProfilePanel`. Asking for "only the missing field" would bypass a platform-wide
rule.

**D-12 · Candidate ID** — accepted
There is no public profile code today. Table `mpt_candidates(user_id, candidate_code)`
issues `CSSV-XXXXXX` on the first application. `student_profiles` is not altered.

**D-13 · Roll number** — accepted
- Five digits from `random_int` (the first is 1–9), followed by a **Damm** check digit.
  Damm catches every single-digit error and every adjacent transposition, which Luhn does
  not fully cover.
- It is unique per mock. A collision is retried up to 10 times inside the transaction.
- It is returned only when `now ≥ roll_number_visible_at`.

**D-14 · Application code** — accepted
Format: `MPTA-{mock_number, 3 digits}-{6 chars}`, drawn from `23456789ABCDEFGHJKMNPQRSTUVWXYZ`
(no 0/O/1/I/L).

**D-15 · Verification token** — accepted
HMAC-SHA256 under `CSSV_APP_SECRET` over `{user_id, application_id, mock_id, exp = now +
15 min}`. START re-checks every eligibility rule, so a leaked token is useless to anyone
else.

## Exam runtime

**D-16 · Single active device** — accepted
`active_session_id` holds the HMAC of the auth session plus a per-tab client id. A write
from any other id returns `409 device_conflict`. "Continue here" calls `takeover` and
logs `DEVICE_TAKEOVER`. The timer never pauses.

**D-17 · Autosave cadence** — accepted
Debounce 2.5 s, heartbeat 30 s, server grace 30 s after `expires_at`. Only changes are
sent. `save_version` must increase, and a stale version returns `409 stale_save`.

**D-18 · Result release and review** — accepted
The score is shown immediately after submit (`IMMEDIATE_SCORE`). Question review opens
after `exam_end_at` (`AFTER_WINDOW`).

**D-19 · Rank and percentile** — accepted
Shown after `exam_end_at` and only when there are **at least 30** completed, non-voided
attempts. Rank is standard competition ranking by score (1, 2, 2, 4). Percentile is the
percentage of completed candidates with a strictly lower score. Both are computed once
and stored.

## Abuse prevention

**D-20 · Rate limits** — accepted
Limits reuse `cssv_enforce_rate_limit` on `login_security_events`:
- apply: 10 per minute per user or IP
- verify: 5 failures per 10 minutes, then a friendly cool-down
- start: 20 per 10 minutes
- submit: 20 per 10 minutes

Saves are not logged per request, to avoid table bloat. They are bounded by
`save_version` and a minimum of 1 s between accepted saves per attempt.

**D-21 · Not-found and not-yours look identical** — accepted
Wrong-owner reads of applications, attempts and results return 404. Verification gives
the same neutral message for "not found" and "belongs to someone else".

## Dashboard & analytics

**D-22 · Legacy mock results** — OWNER
Existing `quiz_attempts` rows with `mock_kind = 'mpt'` are linked to the account, but
their scores were **calculated by the browser and not verified**, under different rules
(free start, full 200 minutes). Default: show them in History labelled "Legacy attempt ·
self-scored" and **exclude them from official averages, highs, trend and rank**. No
applications or roll numbers are invented for them.

**D-23 · Trend rule** — accepted
Shown only with at least 3 completed mocks. It compares the average percentage of the
last 3 with the previous 3: more than +2 pp is "Improving", less than −2 pp is
"Declining", otherwise "Steady". With 3–5 attempts, the comparison uses whatever earlier
attempts exist.

**D-24 · Strongest and weakest subject** — accepted
A subject is ranked only after at least **40 answered questions** in it across completed
mocks. If fewer than two subjects qualify, the item is hidden.

**D-25 · Public "candidates registered" count** — accepted
Shown only at 25 or more active applications, cached for 5 minutes. "Slots available"
appears only when a capacity is configured. Capacity defaults to unlimited (`NULL`).

## Lifecycle

**D-26 · Withdraw and re-apply** — accepted
A candidate can withdraw only before `exam_open_at`, which frees capacity. Re-applying
while applications are open reactivates the same row, keeping the roll number and
setting a new `applied_at`, so the reveal delay applies again.

**D-27 · Legacy URL handling** — accepted
`/gk/quiz?mode=mpt-mock…` differs from other modes of the same path only by its query
string. `ROUTE_REDIRECTS` is path-based, and `/gk/quiz` must keep serving the other modes.
So when the flag is on, `GKQuiz` replaces the `mpt-mock` mode with a `<Navigate replace>`
to `/account/mpt`, with no chain. Internal links are updated directly. With the flag
off, the legacy flow is unchanged.

**D-28 · Time zones** — accepted
Timestamps are stored in UTC `DATETIME(3)` and displayed in Asia/Karachi. The 22:30 slot
ends after midnight PKT, which is fine because every comparison is in UTC.

**D-29 · Migration** — accepted
`server/sql/010_mpt_exam_system.sql` creates new tables only and does not alter any
existing table. `010_mpt_exam_system.down.sql` drops them. There is no downtime and no
existing data is touched. The API also creates the tables idempotently, following the
repo's existing pattern.
