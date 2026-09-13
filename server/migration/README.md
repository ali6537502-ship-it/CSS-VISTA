# Retired account migration

Production cutover completed on 13 September 2026 and is permanently sealed.
These historical importer files remain outside the webroot only for disposable
regression tests. The production endpoint always returns HTTP 410.

Only tests/account-migration/security.mjs copies these files into its disposable
CI build after checking the CI flag, exact test database name and retired endpoint.
Its fresh signing key is test-only. Never deploy these files or restore a production
verification grant. Original source data is retained as a backup.
