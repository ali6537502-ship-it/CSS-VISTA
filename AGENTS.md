# Production invariants

Preserve the established site structure, visual identity, working URLs, account
flows, resource URLs and Hostinger deployment architecture in every change.
Access, indexability, sitemap inclusion and advertising are separate policies.
Never remove a functional page merely to improve search metrics.

Preserve `public/ads.txt` exactly:
`google.com, pub-6131271603014611, DIRECT, f08c47fec0942fa0`
Preserve publisher `ca-pub-6131271603014611` and ownership verification.
Every release must contain ads.txt at the public root.

For added or modified pages, test internal navigation, direct URL access,
refresh, generated HTML, Hostinger rewrites, canonical, robots, sitemap and ad
state. Preserve valuable legacy URLs through tested permanent redirects.
Unknown URLs must return 404, never a homepage or HTTP 200 fallback.

Initial HTML must use actual frontend content or shared stored data. Never add
generic SEO filler, fabricate educational/legal content, or index incomplete
pages. Never silence genuine production validation failures.

Authenticated substantive pages may have explicitly configured manual ads;
authentication transactions, admin, loading and error states must not.
Do not request an AdSense review or interact with live advertisements.

Run the normal Hostinger build, route/content/link audits, advertising tests and
relevant regression tests before publication. Report limitations honestly.
