# Isarul Ibaad Foundation × CSS Vista — Punjab 100 Million Trees

## Release classification
**Private development, not launched.** User data collection (CNIC, mobile and photo evidence) must not be activated until staging security tests, data-protection review and operational sign-off are complete. This is a campaign target of 100,000,000, not an achieved total.

## Implemented protections
- Independent participant account; mobile and CNIC uniqueness via database constraints, with a secret-keyed CNIC fingerprint rather than retained plaintext.
- NO SMS OTP or OTP login. Passwords are hashed; a random offline recovery key is displayed once, stored only as an HMAC, rotated on reset and invalidates all sessions. Lost password and lost key require supervised account-ownership review.
- Sign-in throttling; same-origin write protection, secure HttpOnly session cookies and CSRF token verification.
- Private identity photos (~40 KiB) and planting evidence (~70 KiB). Server independently decodes and re-encodes JPEG output, strips supplied metadata and checks pixel, format and file-size limits.
- Exact SHA-256 evidence de-duplication; 64-bit perceptual image hashing flags suspiciously similar photos for manual examination.
- Default pending moderation. Approved nursery saplings count toward the public goal, while seeds have a separate counter.
- High-quantity claims (more than 5 per photograph) and near-duplicate imagery need administrator-recorded on-site confirmation and a field-visit date.
- All approval, rejection, field-check and revocation actions have a dedicated audit log. Revoking a planting immediately reverses contributor/city counters.
- Transactional city and participant rollups avoid full report-table scans for the primary dashboard/leaderboard.
- Optional consent to public display of name and planting photo; user profile pictures remain private and cannot be downloaded anonymously.
- Self-service deletion requires the current password and explicit confirmation; it removes accounts, photo evidence and all counted contributions.
- Survival observations after 30, 90 and 180 days are separately reported, photo-backed, moderated and never automatically counted as fresh trees.

## Known risks / not technically provable without additional verification
1. **No mobile ownership verification.** A unique phone/CNIC fingerprint prevents an exact duplicate but cannot prove who controls a number or verify legal identity with NADRA. A bad actor could pre-register another person's identity. Administrators must provide a fair manual dispute/appeal procedure.
2. **Photographs do not prove all planted trees or survival.** Perceptual hashing does not detect every manipulation, image reuse, altered scene or invented location. Large reports require actual field visits. Independent spot checks and survivor audits are advised.
3. **Third-party assets.** Botanical thumbnail search results and per-image licensing/attribution should be checked before launch.
4. **Retained backups.** Operational backup deletion windows must be configured and accurately disclosed; removing active records cannot guarantee immediate deletion from every retained backup.
5. **Distributed traffic.** HTTP-level rate limits do not replace a WAF, traffic anomaly monitoring or bot controls.
6. **Foundation identity.** Display branding follows the owner's instruction: Isarul Ibaad Foundation first, CSS Vista second. Confirm the official public legal spelling and authorization of joint campaign materials.
7. **Scale.** Database sizes, archival/partitioning plans, public summary availability, CDN performance, recovery/dispute staffing and reviewer throughput require realistic load tests before nationwide promotion.

## Staging prerequisites
- PHP 8.2+ with PDO MySQL, GD, mbstring and fileinfo.
- Existing secure Hostinger runtime configuration: CSSV_DB_HOST, CSSV_DB_NAME, CSSV_DB_USER, CSSV_DB_PASSWORD, CSSV_APP_SECRET, CSSV_PRIVATE_STORAGE_DIR, CSSV_SITE_ORIGIN.
- Keep CSSV_PRIVATE_STORAGE_DIR outside any public directory and restrict filesystem permissions.
- Do **not** store public upload files in public_html. Do not log registration JSON bodies.
- Apply DB schema in staging, then run a maintenance-window rollup rebuild with the controlled script under scripts/trees/rebuild-rollups.php. For high-volume production, set CSSV_TREES_SCHEMA_MANAGED=1 only after schema validation.
- Run the dedicated tree-campaign quality workflow and full Hostinger build workflow. Complete HTTPS, real MySQL, login/logout/recovery, concurrent duplicate-registration, same-origin/CSRF, image decode, malicious upload, moderator authorization, participant deletion, and 30/90/180-day tests in isolated staging.
- Run a privacy and incident-response review; do not advertise the system as fully penetration-tested without external evidence.
- Check mobile usability, keyboard navigation, field-visit notes, permission failures, and account recovery for lost-key support.

## Counter semantics
The target represents *approved reported sapling planting*, not certified surviving trees. Seed sowing is reported separately. Pending/rejected/revoked claims never count. Survival observations are a separate evidence category, not an addition to total trees.

## Administrative rollback
Keep this initiative in the dedicated development branch until all release conditions pass. No change to existing student accounts, Pro, payments or MPT. To disable the campaign during an incident, set CSSV_TREES_MAINTENANCE=1 (pauses writes) or remove the route via normal deployment rollback, preserving private evidence for incident handling under established retention rules.
