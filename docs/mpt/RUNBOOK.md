# MPT Examination System — Runbook

This runbook is for the site owner and admin. The admin workspace is at
**/sadiaali → MPT examinations**, behind the existing owner password and TOTP.

## 1. One-time production setup

Complete these steps in order. Nothing is visible to students until step 4.

1. **Papers.** Nothing to configure. Every deploy exports the 40 release-audited MPT
   papers exactly as they are. The build log shows
   `MPT official series <id>: 40 audited paper(s)`.
2. **Database.** Nothing to run. The API creates the MPT tables on first use, as it does
   for the other features. To do it by hand, run `server/sql/010_mpt_exam_system.sql` in
   phpMyAdmin.
3. **Cron (recommended).** In hPanel → Advanced → Cron Jobs, run this every minute:
   ```
   php /home/<user>/<repo>/server/bin/mpt-sweep.php /home/<user>/public_html
   ```
   It creates the next daily mocks, auto-submits expired attempts, marks absences and
   computes ranks. Without cron the same work runs on each MPT API request, so results
   are never lost. Ranks may just appear later.
4. **The flow is on by default (D-48).** No setting is needed: every student sees the
   upcoming mocks and applies through My CSS Vista, and the old `/gk/quiz?mode=mpt-mock`
   links hand over to the portal. Optional settings in the private server config
   (`cssv-private/config.php`, alongside `CSSV_DB_*`):
   - `'CSSV_MPT_APPLICATION_FLOW' => 'off'` turns the new flow off (see §6).
   - `'CSSV_MPT_APPLICATION_FLOW' => 'pilot'` with
     `'CSSV_MPT_PILOT_EMAILS' => 'you@example.com,colleague@example.com'` limits it to
     those accounts.
   - `'CSSV_MPT_AUTO_SCHEDULE' => 'off'` stops automatic daily mocks, so you schedule
     each one by hand.

## 2. Daily operation

With automatic scheduling on, the official mocks at **15:00 and 22:30 PKT** are
created **16 days ahead**. Each one:

- **accepts applications from the moment it exists until the exam starts.** Students
  can pick any upcoming mock at any time, but never one that is already running;
- lets applicants who are late still **enter up to 10 minutes after the start**, with the
  time remaining;
- runs for 200 minutes (all attempts end at 18:20 or 01:50 PKT);
- issues the Roll Number 10 minutes after applying, or at exam start if that is sooner.
  Roll numbers are 6 digits, and move to 7 or more digits automatically only when a
  single mock passes 40,500 applicants. There is no limit on the number of candidates;
- publishes each student's **result card 30 minutes after the exam ends**. At the same
  time their **wrong answers** appear in My CSS Vista → My Wrong Answers.

**Paper runway.** The current question bank supports **40 unique official papers**
(the audited set), about 20 days at two a day. Creating mocks 16 days ahead reserves
their papers early, but does not use them up any faster. The admin overview shows "N of 40 papers left". When it
reaches 0, no new mocks are created and the overview says so. No question is ever
repeated to someone who sat an earlier official mock.

To extend the runway:

1. Add reviewed questions to the bank. English comprehension passages are the first
   limit: one passage is needed per paper.
2. Redeploy.

The server automatically skips any exported paper that shares a question with one
already used.

## 3. Scheduling or editing a mock by hand

- **Create:** choose the exam start (PKT) and optional capacity, then press
  **Create mock**. The mock is published immediately with the next audited paper, and
  applications open straight away.
- **Who applied / who appeared:** Open the mock. The tiles show Applied, Appeared, In
  progress, Completed and Absent. The candidate list has an Appeared column and filters
  (All applied / Appeared / Absent). **Export CSV** follows the filter.
- **Edit** (Open → Settings) covers:
  - start time
  - application window
  - duration
  - close and entry offsets
  - Roll Number delay
  - capacity
  - result and review policies
  - pass percentage
  - negative marking (before the exam only)
  - minimum candidates for rank

  Every edit needs a reason, which is written to the audit log.
- **Rescheduling** moves every candidate's reveal time and dashboard countdown
  automatically.
- **Running mocks:** moving or shortening a mock that is already running asks for
  confirmation. Every attempt then ends at the new end time.
- **Cancel mock:** candidates see "Cancelled". Nothing is deleted.

## 4. When a candidate complains

| Complaint | What to check (Open → Applications / Attempts) | Action |
|---|---|---|
| "I can't see my Roll Number" | Search their email. "Applied" shows when they applied; the number appears 10 min later, or at exam start. | Explain the timing. The number is on their dashboard and application page. |
| "My Roll Number is rejected" | The Roll Number column. Roll numbers only work for their owner, for that mock, inside the entry window. | Ask them to copy it from **their own** application page ("Where is my Roll Number?"). A cool-down applies after 5 wrong tries in 10 minutes. |
| "I can't apply" | Is the mock already running? | Applications close when the exam starts. They can apply for any upcoming mock. |
| "Late entry has ended" | Late entry ends 10 minutes after the start. | This is the rule. They are marked Absent, which never counts as zero. |
| "Where is my result?" | Result card time = exam end + 30 minutes. | It appears on their dashboard then, along with their wrong answers. |
| "The exam is open on another device" | The attempt's Takeovers count. | They verify their Roll Number again on the device they want and press **Continue**. The timer never paused. |
| "My connection dropped / the browser crashed" | Last save time on the attempt. | Answers are saved every few seconds and resume on refresh. Unsubmitted attempts are submitted automatically at the end. |
| Genuine technical failure | Attempts tab: started, submitted, tab switches, takeovers. | **Void** the attempt (reason required), then **Grant re-sit**. A re-sit only works while entry is still open. |
| Cheating suspicion | Tab switches and takeovers are recorded, never penalised automatically. | Void with a reason if justified. |

## 5. Correcting an answer key (rescore)

1. Open the mock → **Rescore**.
2. Enter one correction per line as `question number: correct option`, for example
   `37: C`.
3. Enter a reason.

Every finished attempt is rescored, statistics and ranks are recomputed, and candidates
see "Result updated on {date} after an answer-key correction". For very large mocks the
server works in batches of 200. If the response shows `remaining` above 0, press the
button again with no corrections to continue.

## 6. Rolling back

- **Instant, no data loss:** set `CSSV_MPT_APPLICATION_FLOW` to `'off'`. The site behaves
  exactly as before: the daily free-start mocks return and the new pages show "not
  available". Applications, attempts and results stay in the database and return when
  the flag is switched back on.
- **Code:** revert the release commit and redeploy. The MPT tables are simply unused.
- **Remove data (irreversible):** run `server/sql/010_mpt_exam_system.down.sql`. Do this
  only if the feature is being abandoned. Export applications first (CSV).

## 7. Where things live

| Thing | Location |
|---|---|
| Server rules | `public/api/_mpt_core.php` (pure rules), `_mpt.php` (services), `_mpt_admin.php` |
| Candidate API | `public/api/mpt/*.php` |
| Admin API | `public/api/admin/mpt.php` |
| Schema / rollback | `server/sql/010_mpt_exam_system.sql` / `.down.sql` |
| Cron sweeper | `server/bin/mpt-sweep.php` |
| Paper export | `scripts/export-mpt-papers.mjs` → `dist/api/_mpt_papers/` (never web-readable) |
| Candidate UI | `src/pages/mpt/`, `src/components/mpt/`, strings in `src/lib/mpt/copy.ts` |
| Admin UI | `src/pages/admin/MptAdminPanel.tsx` |
| Audit log | table `mpt_events` (append-only) |
