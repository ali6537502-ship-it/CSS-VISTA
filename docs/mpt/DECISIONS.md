# MPT Examination System — Decisions

Every default and trade-off chosen while building the MPT application flow. The
Section 1A locked decisions in the master command override anything here, **except where
the owner later changed them explicitly** (see "Owner changes, round 2" at the end).
Entries marked **OWNER** need the site owner's confirmation. Until they confirm,
the stated default applies.

Status key: `accepted` (engineering default, reversible) · `OWNER` (awaiting confirmation).

---

## Architecture

**D-01 · Two official mocks every day, created automatically** — confirmed by owner (25 Sep 2026)
The existing daily slots stay: **15:00 and 22:30 PKT**. Each slot is its own official mock
with its own application and roll number. The server creates the next slots automatically,
idempotently via a unique `schedule_key` such as `daily-2026-09-26-1500`, from the cron
sweeper and opportunistically from MPT API reads. Defaults for each auto-created mock:

- applications open 24 h before `exam_open_at`
- applications and entry close at `exam_open_at + 10 min`
- 200 minutes; `exam_end_at = exam_open_at + 200 min` (18:20 and 01:50 PKT)
- roll-number delay 10 min; capacity unlimited

The admin can edit or cancel any mock, and auto-creation itself can be switched off
(`CSSV_MPT_AUTO_SCHEDULE=off`). A mock is auto-created **only when a fresh official paper
is available** (D-04). Otherwise nothing is created, and the admin screen shows that the
paper runway is exhausted.

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

**D-04 · Official paper supply: a build-exported series, frozen at creation** — accepted
- **Measured capacity:** the current pools yield **exactly 40 unique papers** in sequence.
  The 41st fails because the 40 English comprehension passages are used up (measured
  25 Sep 2026). At two mocks a day that is **20 days** of official mocks. Growing the bank,
  above all with new comprehension passages, is the only honest way to extend it. Papers
  are never recycled and questions are never repeated to candidates who sat earlier
  official mocks.
- **Export.** After `vite build`, `scripts/export-mpt-papers.mjs` runs the unchanged engine
  (`buildCompetitiveMock`) over the same 40 audited session keys the release audit uses,
  with one shared history. It writes `dist/api/_mpt_papers/manifest.php` and one
  `<index>.php` per paper. Each file returns a base64 JSON string that includes the key.
  - They are blocked by `.htaccess` (`^api/_mpt` → 403), and executing them outputs nothing.
- **Secret selection salt.** `buildCompetitiveMock` gains an optional
  `{selectionSalt}` argument. When it is empty, output is byte-for-byte what it is today,
  and the release audit stays as it is. The exporter passes
  `HMAC(CSSV_MPT_PAPER_SEED, 'official-series')`. That changes tie-breaks and option
  order, so the official paper cannot be rebuilt from public code (AUDIT C3).
  - `CSSV_MPT_PAPER_SEED` is a Hostinger **build** environment variable, never `VITE_`.
  - Without it the manifest is marked `publishable: false`, and the server refuses to
    create official mocks from it.
  - If the salted series comes up short of 40, the exporter ships the papers it did build
    and records the shortfall, rather than breaking the production build. The unsalted
    release audit remains the build gate.
- **Freeze.** When a mock is created, PHP copies the chosen paper, key included, into
  `mpt_mock_questions`. From then on nothing at build time can change it. The chosen paper
  is the first one in the current manifest that shares **no question id** with any
  previously frozen official paper. After a deploy that changed the pools, overlapping
  papers are therefore skipped automatically instead of being repeated.

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

**D-07 · Residual risk: answers in the public practice banks** — accepted by owner for now (25 Sep 2026)
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
| `/account/mpt/results/:code` | result | authenticated | private | no/no | disabled (a result screen is an assessment state in `isAdSuppressedState`) |
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
`GET /api/mpt/flow.php` exposes only `{enabled: bool}` for the current user. With the
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

**D-16 · Single active device and resume** — accepted
Each browser tab creates a random `client_id` and keeps it in `sessionStorage`.
`active_session_id = HMAC(auth session id + client_id)`.
- Resuming with the same browser session and the same client id (refresh, reconnect)
  needs no re-verification.
- Opening the attempt anywhere else returns `409 device_conflict`. "Continue here" then
  goes through the roll-number gate again and calls `takeover`, which logs
  `DEVICE_TAKEOVER`.
- The timer never pauses.

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
Limits are counted **per account** in `login_security_events.user_id`, not per IP. Many
candidates sit behind one academy or hostel NAT, and an IP-wide lockout at exam time
would be unfair.
- apply: 10 per minute per user, plus 120 per minute per IP as a flood guard
- verify: 5 failed attempts per 10 minutes per user, then the friendly message "Too many
  incorrect attempts. Please wait a few minutes, then copy the Roll Number from your
  application."
- start: 20 per 10 minutes
- submit: 20 per 10 minutes
- takeover: 10 per 10 minutes

Saves are not logged per request, to avoid table bloat. They are bounded by
`save_version`, a 200-change cap per request, and the attempt deadline.

**D-21 · Not-found and not-yours look identical** — accepted
Wrong-owner reads of applications, attempts and results return 404. Verification gives
the same neutral message for "not found" and "belongs to someone else".

## Dashboard & analytics

**D-22 · Legacy mock results** — confirmed by owner (25 Sep 2026)
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
When the flag is on, `GKQuiz` therefore replaces the `mpt-mock` mode with one
`<Navigate replace>` to `/account/mpt`, never to the exam. The `/mpt` tiles and buttons,
the site notice bar and the dashboard link straight to the portal. Other links that still
build the legacy URL (`Progress`, `ExamIntelligence`, Home's mock windows) reach the portal
through that single hop. With the flag off, the legacy flow is unchanged.

**D-28 · Time zones** — accepted
Timestamps are stored in UTC `DATETIME(3)` and displayed in Asia/Karachi. The 22:30 slot
ends after midnight PKT, which is fine because every comparison is in UTC.

**D-29 · Migration** — accepted
`server/sql/010_mpt_exam_system.sql` creates new tables only and does not alter any
existing table. `010_mpt_exam_system.down.sql` drops them. There is no downtime and no
existing data is touched. The API also creates the tables idempotently, following the
repo's existing pattern.

## Decisions made during Phase 1

**D-30 · Signed-out visitors see the real window state** — accepted
With no user, the state engine returns `LOGIN_REQUIRED` only while applications are open.
Before or after the window it returns `NOT_YET_OPEN` or `APPLICATIONS_CLOSED`, because
"Login to Apply" for a closed mock would be misleading.

**D-31 · The paper API uses positions, never bank question ids** — accepted
The public practice banks are keyed by the same ids, so shipping an id would let anyone
look up the answer instantly. The candidate paper is `{p, section, q, o}`. Saves send
`{p, o}`. The mapping from position to question id and key exists only in
`mpt_mock_questions`.

**D-32 · Which verification failures count toward the lockout** — accepted
These count, because they indicate guessing: a bad check digit, a roll number that is
unknown or belongs to someone else, and a roll number that is not yet revealed. These do
not count, because they are honest timing mistakes: "Entry opens at…", "Entry closed",
"already completed", and "belongs to a different mock of yours".

**D-33 · Rank waits for every attempt of the mock to be final** — accepted
Rank and percentile are computed once, after `exam_end_at + 30 s` grace, and only once no
attempt of that mock is still `IN_PROGRESS`. They are shown only when at least
`rank_min_candidates` completed attempts exist (default 30).

**D-34 · Server tests run with the flag `on`** — accepted
`tests/mpt/security.mjs` runs against a service started with
`CSSV_MPT_APPLICATION_FLOW=on`. The off/pilot/fail-closed logic is covered separately by
`tests/mpt/flag.php`. The PHP test server runs with `PHP_CLI_SERVER_WORKERS=8`, so the
50-way capacity race and double-tap tests are genuinely concurrent.

## Decisions made during the candidate UI (Phases 2–5)

**D-35 · No promotional popup over the exam or the Roll Number gate** — accepted
The site's once-per-session notes-bundle offer appeared on any first page, including
`/account/mpt/exam/…` when a candidate opened a fresh tab to continue. It is now
suppressed on `/account/mpt/exam/` and `/account/mpt/entrance/` only. It is not
dismissed there, so it can still appear elsewhere later in the same session.

**D-36 · Exam focus mode** — accepted
On the same two routes the layout omits the floating VISTA SHORTCUT button and the mobile
bottom navigation. Both covered the exam's page controls and Submit button on phones
(found by the browser test at 375 px). The header stays, so the candidate can always
leave. On every other page the layout is unchanged. The exam timer lives in the fixed
bottom bar, which nothing overlaps, because the site's sticky header covered a sticky-top
timer.

**D-37 · Notice bar and `/mpt` with the flag on** — accepted
The site-wide notice bar's two "LIVE REGISTRATION… finish your paper after entry"
messages describe the old free-start rule. With the flag on they are replaced by one
accurate notice linking to `/account/mpt`. On `/mpt` the two free-start mock tiles give way
to the application panel. Prerendered HTML is unchanged, because the flag is only known
client-side.

**D-38 · Late-start wording** — accepted
The verified screen shows whole minutes remaining, and "minutes late" as the rest of the
duration. The two always add up to the paper length and never overstate the time
available. For example, 2 min 30 s late on a 200-minute paper reads "3 minutes late … 197
minutes".

**D-39 · Charts** — accepted
Each chart shows a single series in one validated hue: emerald-700 (`#047857`) on light,
emerald-600 (`#059669`) on dark. Both pass the dataviz palette validator against their
surfaces. Lines are 2 px with 8 px markers and one 0–100 % axis. Each chart has a
hover/focus tooltip and a table view. Subjects use small multiples, not a multi-hue
legend.

## Owner changes, round 2 (25 Sep 2026)

These override Section 1A and the earlier entries where they differ.

**D-40 · The official papers are the 40 release-audited papers, unchanged** — owner
The optional selection salt (D-04) is removed and `buildCompetitiveMock` is byte-for-byte
the original. The exporter emits exactly the series that `npm run audit:mpt-40`
approves: same session keys, same order, same options. `CSSV_MPT_PAPER_SEED` is no
longer used. Consequence, accepted by the owner: a technically skilled person could
rebuild a paper from the public code before the mock (AUDIT C3). Server-held keys,
server scoring and positions-not-ids (D-31) are unchanged.

**D-41 · Roll numbers have no upper limit** — owner (replaces 1A #3 "6 digits")
A roll number is 6 digits (5 random + Damm check digit) while the mock has fewer than
40,500 applications. Beyond that it becomes 7 digits (up to 405,000), then 8, and so on,
up to 12. Each length is used only while it is at most ~45 % full, so random collisions
stay rare. After 10 collisions at one length the server moves to the next length instead
of failing. The first digit is never 0, so a longer number can never equal a shorter one.
The entrance gate accepts 6–12 digits, spaces ignored. Numbers are displayed in groups
of three. Typical mocks keep 6-digit numbers.

**D-42 · Apply any time for an upcoming mock; never for an ongoing one** — owner
(replaces 1A #5)
- Applications open **as soon as a mock exists** and close **when the exam starts**
  (`application_close_at = exam_open_at`).
- The daily 15:00 / 22:30 PKT mocks are created **a week ahead**, so a student can pick
  any upcoming mock.
- "Entry opens / entry closes" is gone from the candidate screens. They show "Exam
  starts" and "Late entry until" (applicants may still enter up to 10 minutes late with
  the time left, as before).
- The Roll Number rule (1A #4) is unchanged. Because nobody can apply during an exam now,
  the "instant roll number for late applicants" case can only arise if an admin extends
  a window.

**D-43 · Result card 30 minutes after the mock** — owner
`results_release_policy` now defaults to `AFTER_WINDOW`, with a new per-mock
`results_delay_minutes` (default 30). Score, result card, rank and answer review all open
at `exam_end_at + 30 min`. This also gives the server time to finish every automatic
submission first. The result card carries:
- the CSS Vista logo;
- candidate, candidate ID, roll number and application ID;
- the mock date and time window;
- score, percentage, correct / incorrect / unattempted and accuracy;
- rank and pass mark where eligible;
- "Congratulations on completing CSS Vista MPT Mock N".

It prints, or saves as PDF, cleanly through the scoped print stylesheet. The
congratulation line celebrates completion, not a pass, so it is never misleading.

**D-44 · Wrong-answer bank** — owner
`/account/mpt/mistakes` (and `GET /api/mpt/mistakes.php`) lists every question the
student answered incorrectly in completed official mocks, with their answer, the
correct answer and the explanation. It can be filtered by subject and is paginated. It
opens with the result card, 30 minutes after the mock, never earlier, so answers cannot
leak while others are still sitting. Mocks whose review policy is `NEVER` are excluded.
It is linked from the dashboard card, the MPT area and the result page.

**D-45 · Admin: who applied, who appeared** — owner request
- The admin already had the per-mock candidate list and counts. It now labels them
  **Applied / Appeared / In progress / Completed / Absent**.
- The overview table has an Appeared column.
- Each mock's candidate list has an **Appeared** column and filter buttons:
  All applied / Appeared / Absent or not yet.
- The CSV export follows the filter and includes an Appeared column.

**D-46 · Load hardening** — owner request ("a lot of students")
- **Apply:** no shared lock when capacity is unlimited (the default), so concurrent
  applies don't queue behind one row. Uniqueness stays enforced by the database indexes.
  A capacity-limited mock still serialises applies, which is what makes "exactly one
  winner" correct.
- **Rate limits:** a dedicated `mpt_rate_hits` table indexed by (subject, bucket, time),
  so each check is one index range, pruned daily. They no longer share the site-wide
  login-events table. The per-IP flood guard is 600 applies/min, so a whole academy on
  one connection is never blocked.
- **Autosave:** one batched lookup and one multi-row upsert per save. Save and resume
  skip the profile re-check and the maintenance hook. The client batches answers every
  4 s (was 2.5 s), saves nothing when nothing changed, and heartbeats every 60 s only
  when changes are waiting (was every 30 s regardless).
- **Reads:** history is one query instead of several per mock. Public "candidates
  registered" uses the maintained counter instead of `COUNT(*)`. The state engine no
  longer runs an extra query per card.
- **Sweeper:** the cron run processes up to 5,000 expired attempts within a 45-second
  budget. The 30-minute result delay leaves ample time to score every attempt before
  results open.
- **Limit that remains:** Hostinger shared PHP is the ceiling. For very large simultaneous
  sittings (many thousands at once), watch hPanel resource usage in the first mocks and
  consider a higher Hostinger plan. The code has no per-mock or per-roll-number limit.

**D-47 · Every mock is named by its sitting and time** — owner
Wherever a mock appears, its name is followed by "Afternoon MPT Mock · 3:00 PM PKT" or
"Evening MPT Mock · 10:30 PM PKT", plus the date and window (e.g. 3:00 PM – 6:20 PM PKT).
The sitting is derived from the start time in Pakistan: before 12:00 is Morning, before
17:00 is Afternoon, later is Evening. An admin-created mock at another time is therefore
named correctly too. Times show as "3:00 PM".

**D-48 · Live for everyone by default, mocks always visible** — owner ("everyone should
see the coming mock")
- `CSSV_MPT_APPLICATION_FLOW` now defaults to `on`. The private config can still set
  `off` (rollback) or `pilot`. D-10's staged rollout is superseded.
- Automatic scheduling keeps the next **16 days** of 15:00 and 22:30 PKT mocks created,
  so the next mock is always listed and open for applications. It runs until the audited
  paper runway is used up (40 papers, about mid-October). New papers extend it.
- A request-time maintenance run creates at most 3 mocks, so the first visitor after a
  deploy never waits long. The cron sweeper creates up to 40 per run. Freezing a paper
  uses one overlap query and multi-row inserts.

**D-49 · Only the next mock is listed** — owner ("only the next single MPT should be shown")
The public MPT page, My CSS Vista and the dashboard card list one upcoming mock: the next
one to start. A student also keeps seeing every mock they have applied to until its window
ends, so an applicant can still enter a running mock and see its status. When a mock
starts, the following one takes its place for new applications. Mocks further ahead
still exist (D-48) but are not listed.

**D-50 · Separate MPT options, and the photo on the Roll Number slip** — owner
- The dashboard MPT card, My CSS Vista MPT area, history, wrong-MCQ and performance pages
  share one options row: MPT Mocks, My Applications, My Results, My Wrong MCQs, My
  Performance. Each opens its own page. My Results is the history filtered to completed
  mocks (`/account/mpt/history?status=completed`), so no new route was needed.
- The application page's candidate block is now the **Roll Number Slip** and shows the
  photo from the student's own account (`/api/student/photo-view.php`, owner-only). The
  photo is printed with the slip. Without a photo it links to the profile to add one.

**D-51 · A running mock is always visible** — owner ("where is the MPT mock being conducted?")
- While a mock is running (start to end), every listing shows it to everyone. Students
  who did not apply see a red **Live now** notice: when it started and ends, that only
  applicants can take it, and that applicants enter with the Enter Exam button on their
  dashboard. The next mock stays listed below it for applying.
- The current-mock card shows three steps (apply, Roll Number, Enter Exam at the start
  time), with the current step highlighted, so students know the exam is entered from
  that same card.

**D-52 · The MPT Mock is named wherever the MPT is** — owner ("everywhere MPT is mentioned")
- One shared lookup (`useMptSpotlight`, one request a minute while the tab is visible)
  picks the mock to point at: the viewer's own mock when it is live, else a mock being
  held now, else the viewer's reserved mock, else the next mock.
- It appears in the site-wide notice bar on every page, and as a compact strip on the home
  page timers, MPT question banks, Start CSS and GK World. The MPT page itself has the
  full MPT panel with the same live notice. The strip
  renders nothing until the server answers, so prerendered HTML is unchanged.
- With the flow on, the home page's legacy free-start MPT windows give way to the strip,
  as the notice bar already did.

**D-53 · The exam entrance is always visible** — owner ("nowhere does it show where to enter")
- Every mock card, the Live now notice, the MPT page panel and the MPT Mock strip show an
  **Enter Exam** button at all times, linking to that mock's entrance page. Before the
  start it is shown locked with "Opens at 3:00 PM PKT" (and "for applicants" to anyone
  who has not applied). At the start it becomes the solid Enter Exam button.
- The entrance page says, before anyone types, whether it is open to them yet: "You have
  not applied" with an Apply button, or "You are in the right place. Entry opens at…" with
  a countdown. The server rules are unchanged.
