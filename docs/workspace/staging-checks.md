# Private staging checks

Readiness audit: 30 October 2026. Reviewed local implementation:
`1cccc7d9d2cf5dd3944f9778f0124f0bc8b8c27a` on `review/student-workspace`.
No application changes, remote writes, DNS changes or deployment were made in
this audit. The previous verification results are in
[verification-followup.md](verification-followup.md).

## Current blocker

No staging URL or deployment target was found in the repository documentation or
current GitHub workflow listing. The remote main Hostinger workflow matches the
local file (`ceb7fb830b9e4fe38fe460a327685cbe97896560`) and observes production
deployment after main pushes. The externally configured Hostinger Git integration
cannot be verified through those workflow files. No Hostinger/browser connection
or hosting credentials are available in the current environment. This does not
prove that no staging site exists outside the repository.

Needed: an existing private staging URL plus authorized access to its separate
hosting environment, or a separately provisioned staging site. Supply access
through a secure connection or environment secret binding, never chat or Git.

## Hosting and routing prerequisites

- Retain the native PHP/MySQL architecture. Use a separate document root,
  database/database user, application secret and private-storage directory.
  Create synthetic test accounts; do not clone production student records.
- Protect the entire staging site over HTTPS and prevent indexing. Its cookies,
  uploads, API requests and mail links must remain scoped to the staging host.
  Set runtime `CSSV_SITE_ORIGIN` to the confirmed staging origin in private config.
- The current production artifact is **not a ready-to-upload staging artifact**:
  its generated `.htaccess` redirects non-production hosts to `www.css-vista.com`
  and includes production-specific absolute legacy redirects. A separate reviewed
  staging routing overlay must retain all private-file, authentication and ad
  protections while keeping navigation on the staging host. Stop if any account
  request or redirect reaches production.
- The Hostinger build preflight intentionally requires the production canonical
  `SITE_ORIGIN`. Preserve that production rule. A staging packaging procedure must
  be reviewed separately after the real target is known; do not weaken preflight
  or replace the production artifact to facilitate previewing.
- Keep the web runtime outside CI authoring mode, with Pro/MPT paused and paid/AI
  operations closed. A frontend preview connected to production APIs is unsuitable.
- Use a controlled test mailbox and staging SMTP configuration for real delivery.
  The local invalid-domain mail capture verifies recovery logic only.
- Use the exact reviewed source revision. Inspect target/deployment hooks before
  any upload or remote branch write; do not merge/push main or dispatch the
  production bootstrap workflow to create staging.

## Acceptance checklist

Record the actual staging URL, source fingerprint, device/browser and outcome.

| Check | User-visible evidence |
|---|---|
| Signup and photo | All fields on one page, one submit, real save, correct uploaded header photo, refresh retains details |
| Phone interaction | All seven sections usable in portrait/landscape; keyboard and bottom navigation do not hide controls; visible focus and readable labels |
| Email recovery | Controlled inbox receives code/link; both reset paths work; old password/session and replay fail; saved records remain |
| Two-device sync | Same synthetic account on two devices; complete task and bookmark a resource on one, refresh/reopen the other and confirm both records |
| Account isolation | Sign out and use a second synthetic account; first account's tasks, results, saved resources and photo are absent |
| Assessment continuity | Start an allowed timer/practice session; navigate/refresh and resume with original state; complete through the existing result flow |
| Paused access | Pro purchase/paid tools and suspended MPT remain paused; ordinary free tools work |
| Official subjects | Retrieve applicable official FPSC material; compare six slots, alternative rule, marks and optional groups without rewriting saved identifiers |

Any failed check retains its evidence and remains unresolved. A staging pass does
not authorize production release. Physical-device/inbox outcomes must not be
reported from browser emulation or captured test mail.
