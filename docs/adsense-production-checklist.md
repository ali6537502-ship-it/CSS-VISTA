# CSS Vista AdSense production checklist

The application uses publisher `ca-pub-6131271603014611`. It loads Google's official Auto Ads script on substantial, eligible public content routes. The lower homepage is eligible, while the search and hero are grouped inside the stable `#cssv-home-ad-free-top` boundary so that area can remain ad-free. Questions, mocks, private areas, legal pages, PDF viewers and interactive tools are fail-closed and do not render a site-managed ad slot. The mixed `/current-affairs` page is also fail-closed because its MCQ state shares the same parameterized URL and AdSense page exclusions do not support parameters.

## Required AdSense dashboard actions

1. Confirm the AdSense Sites entry is the root domain `css-vista.com` (not a URL path) and complete Google's review steps. The canonical site remains `https://www.css-vista.com`, and the apex root redirects safely to it.
   Select AdSense's **Meta tag** verification method (or **Ads.txt code snippet**). The live homepage contains `<meta name="google-adsense-account" content="ca-pub-6131271603014611">`, while `https://www.css-vista.com/ads.txt` contains the exact authorized seller record. If the dashboard is left on an unmatched verification method, it can report “code not found” even though either supported alternative is present.
   After choosing the matching method, click **Verify**, then **Request review**. Do not delete and recreate a correct `ads.txt`; Google says status refresh can take several days and, on low-ad-request sites, up to a month.
2. Enable Auto Ads and Vignette ads in AdSense. Set the Vignette frequency to **1 minute** in AdSense; application code does not simulate this with timers or navigation counters.
3. In the Auto Ads preview, add the homepage element identified by `#cssv-home-ad-free-top` to **Excluded areas** on both mobile and desktop. Keep the selector stable. This leaves lower homepage content eligible without placing an in-page Auto Ad in the search/hero block.
4. Keep the dashboard page-exclusion list narrow: `/answer-timer` and `/gk/quiz`. The `/gk/quiz` URL is shared by its start, active-mock and result states, so the whole route is excluded rather than risking a Vignette during a mock. Do not add broad dashboard exclusions for the homepage or substantial informational routes. Application route policy continues to fail closed on private, legal, PDF-viewer and active question-solving states.
5. Use a Google-certified CMP where required. Configure the EEA, UK and Switzerland consent message and a working privacy-options revocation entry in Google's Privacy & messaging area before serving personalised advertising there. Add `https://www.css-vista.com/privacy-policy` as the published privacy-policy URL.
6. If a manual in-content unit is desired later, first create a responsive display unit in AdSense, then add and review a route-specific placement at a natural content break before setting its real numeric ID as `VITE_ADSENSE_SLOT_CONTENT`. The environment variable alone does not insert an ad globally. With no audited placement and genuine slot ID, the application intentionally renders no manual container and leaves no blank space.

Mock start and completed-result manual placements remain disabled until separate, genuine Google-issued slot IDs and purpose-built placements are supplied. Active question-solving screens must remain ad-free.

Also review **Policy centre** for account-specific issues and set AdSense seller information accurately in the dashboard. These account settings cannot be completed safely from repository code.

## Deployment verification

Run:

```text
npm run test:ads
npm run build:hostinger
npm run audit:hostinger
npm run check:adsense
```

Do not click live ads or automate ad clicks during testing. Passing technical checks does not guarantee AdSense approval, ad fill, Google indexing or search ranking.
