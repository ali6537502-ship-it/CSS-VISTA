# Push to publish

Add an edition at `YYYY/MM/YYYY-MM-DD.json` in this directory and push it through the existing main/Hostinger workflow. No page editing or per-student distribution is needed.

The production build validates every edition and creates server-only PHP release payloads. After deployment, the next authenticated briefing request imports changed editions atomically into the shared Hostinger database before serving content. Every student then sees the same published edition with their own bookmarks and reading history.

Never put these files in `public/`. No raw edition JSON is emitted into the public build. Test examples live in `examples/current-affairs/` and cannot be published by the production build.

See [the publishing contract](../../docs/current-affairs-publishing.md) for the exact schema, corrections, failure handling and optional direct API publishing.
