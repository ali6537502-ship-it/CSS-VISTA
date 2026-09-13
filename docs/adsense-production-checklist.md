# CSS Vista AdSense production checklist

The application uses publisher `ca-pub-6131271603014611`. It loads Google's official Auto Ads script on substantial, eligible public content routes. The lower homepage is eligible, while the search and hero are grouped inside the stable `#cssv-home-ad-free-top` boundary so that area can remain ad-free. Questions, mocks, private areas, legal pages, PDF viewers and interactive tools are fail-closed and do not render a site-managed ad slot. The mixed `/current-affairs` page is also fail-closed because its MCQ state shares the same parameterized URL and AdSense page exclusions do not support parameters.

## Required AdSense dashboard actions

1. Confirm the AdSense Sites entry is the root domain `css-vista.com` (not a URL path) and complete Google's review steps. The canonical site remains `https://www.css-vista.com`, and the apex root redirects safely to it.
   Select AdSense's **Meta tag** verification method (or **Ads.txt code snippet**). The live homepage contains `<meta name="google-adsense-account" content="ca-pub-6131271603014611">`, while `https://www.css-vista.com/ads.txt` contains the exact authorized seller record. If the dashboard is left on an unmatched verification method, it can report “code not found” even though either supported alternative is present.
   After choosing the matching method, click **Verify**, then **Request review**. Do not delete and recreate a correct `ads.txt`; Google says status refresh can take several days and, on low-ad-request sites, up to a month.
2. Enable Auto Ads and Vignette ads in AdSense. The owner requested a 3-minute Vignette interval, but Google's dashboard offers only 1, 2, 5, 10, 30 and 60 minutes. It is therefore configured to **5 minutes**, the nearest available setting that does not show Vignettes more often than requested. Application code must not simulate this with timers or navigation counters.
3. In the Auto Ads preview, add the homepage element identified by `#cssv-home-ad-free-top` to **Excluded areas** on both mobile and desktop. Keep the selector stable. This leaves lower homepage content eligible without placing an in-page Auto Ad in the search/hero block.
4. Keep the dashboard page-exclusion list narrow: `/answer-timer`, `/gk/quiz` and `/account`. The `/gk/quiz` URL is shared by its start, active-mock and result states, so the whole route is excluded rather than risking a Vignette during a mock. `/account` stays excluded from Auto Ads because its URL does not reveal whether a sensitive account state is visible. Do not add broad dashboard exclusions for the homepage or substantial informational routes. Application route policy continues to fail closed on private, legal, PDF-viewer and active question-solving states.
5. Use a Google-certified CMP where required. Configure the EEA, UK and Switzerland consent message and a working privacy-options revocation entry in Google's Privacy & messaging area before serving personalised advertising there. Add `https://www.css-vista.com/privacy-policy` as the published privacy-policy URL.
6. The responsive display unit **CSS Vista Signed-In Account** was created in the connected AdSense account with genuine slot ID `1618565899`. It is wired only to one separated placement at the bottom of `/account`, appears only after authentication has settled, and disappears for password recovery or password-change states. `/account` remains excluded from Auto Ads, so Google cannot automatically place Vignettes or units beside account controls. Audit any additional route-specific placement before enabling it.
7. Because this manual unit is behind login, configure AdSense crawler access with a dedicated, least-privilege test account if Google requests access to evaluate the page. Never put crawler credentials in source code, repository documentation or a public page.

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
