# Security hardening and release verification

This change keeps the existing owner release hold, accounts, private educational content, product restrictions, and saved records intact. It does not activate Pro, AI or payments.

## Changes

- Factbook uses DOMPurify with an explicit formatting allowlist. Source links allow only absolute HTTP(S) addresses, and new tabs retain noopener/noreferrer. Node/SSR fallback escapes HTML. Input is capped before parsing, with no slicing of sanitized markup. Regression tests cover unsafe nested/imported-note content, repeated sanitization and preserved formatting.
- Zod is updated to an advisory-fixed version; dependencies and lockfile are kept together. Compatible transitive updates also remove the high-severity development-tool advisories found during remediation. CI checks production advisories and Dependabot proposes weekly npm and Actions updates. Three moderate development-only findings remain in the Tailwind 3 / postcss-nested / selector-parser dependency chain. npm recommends a breaking Tailwind 4 migration; that redesign/build migration is not forced into this security change. Production dependencies have no reported advisories at validation time.
- Real environment/configuration files, private keys, database files and backup copies are ignored; the previously empty tracked .env.production is removed. Reviewed example files remain tracked. This does not remove any historical secrets: GitHub secret scanning and history review remain separate administrative tasks.
- Apache explicitly denies credential/backup files, version-control metadata and all top-level private PHP helpers. Existing authenticated API routes, verification files and crawler files remain served.
- Anonymous GET /api/health.php returns only {"ok":true} on a healthy runtime. It makes no database query. Database/mail/storage diagnostics are available only from GET /api/admin/health.php after separate owner login and MFA. These private responses keep no-store headers. Public liveness is not database readiness; deployment probes no longer imply otherwise.

## Browser policy rollout

The enforced CSP restricts base URLs and framing, upgrades insecure requests, and limits object embeds to self/blob to preserve the existing magazine PDF viewer. A report-only script policy allows same-origin and the Google advertising domains listed in public/.htaccess, and reports inline script/handler violations in browser developer tools.

The script policy is **not enforced yet**. No report collection endpoint has been configured. Before promoting it to enforcement, exercise AdSense, account screens, Factbook imports/editing, PDF viewing and public navigation in a staging/browser session, review console violations, and replace legitimate inline scripts with reviewed hashes/nonces or external scripts. Do not add unsafe-inline to silence unknown violations. Verify the final response headers on Hostinger: the host may set its own CSP.

## Repository settings still require administrative access

The current GitHub integration returned HTTP 403 for changing repository visibility and reading webhooks/deploy keys. The repository remains public until an authorized account changes it. No setting success is implied by this branch.

1. In Hostinger, confirm the deployment uses an authorized GitHub app or read-only deploy credential that supports a private repository.
2. In GitHub repository Settings → General → Danger Zone → Change repository visibility, make CSS-VISTA private.
3. Confirm unauthorized visitors cannot access the repository and Hostinger can still fetch the intended branch. Do not deploy or merge automatically as part of this check while the owner's release hold is in force.
4. Review collaborators, installed apps, deploy keys, Actions access/artifacts and active sessions; enable available secret scanning/push protection. Require MFA on GitHub, Hostinger and the owner's email account.

Changing visibility cannot retract copies already made. Public browser assets/content remain inspectable. Preserve truly private material on the server and enforce access there.

## Validation

Run npm run test:factbook, npm run typecheck, npm run lint, npm audit --omit=dev, npm run build:hostinger and npm run test:all. The native current-affairs workflow also runs tests/security/health.mjs against its disposable database to check anonymous/student/unverified/expired/revoked denial and verified owner diagnostics.

Before a production release, verify HTTPS CSP headers, protected-file denials, public liveness, private diagnostics, normal account use and the exact live deployment fingerprint. Do not claim these changes are live until those checks pass after release.
