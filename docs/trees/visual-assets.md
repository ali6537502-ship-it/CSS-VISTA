# Tree campaign visual assets and brand use

## Identity
The campaign displays **Esar ul Ebad Welfare Foundation × CSS Vista**, foundation first. The two original, unmodified logo files remain:
- `public/images/esar-ul-ebad-logo.webp` — original supplied foundation emblem.
- `public/images/logo.webp` — original CSS Vista logo.

No new logo, redesigned badge, invented seal, or composite replacement was generated. The circular "100M" interface badge is decorative campaign-target typography, **not** a foundation logo.

## Real photography
The website uses actual photographs in illustrative cards, rather than AI-generated images. All photographs are explicitly separated from the community's moderated planting evidence.

| Appearance | Photograph | Source / usage |
| --- | --- | --- |
| Campaign hero, progress card and homepage feature | Bleron Salihi, forest aerial canopy | [Unsplash](https://unsplash.com/photos/an-aerial-view-of-a-lush-green-forest-041fmZSYvOw) — licensed under the Unsplash License |
| Joining the planting movement | Pranav Gavali, seedling emerging from soil | [Unsplash](https://unsplash.com/photos/a-young-green-seedling-growing-from-dark-soil-4KnaYSLHnAI) — licensed under the Unsplash License |
| Photo documentation card | Greta Hoffman, rows of greenhouse nursery seedlings | [Pexels](https://www.pexels.com/photo/rows-of-containers-with-green-seedlings-in-soil-7728015/) — free-use Pexels license |

The photographs are loaded from their respective licensed CDN image URLs with responsive cropping, fixed intrinsic dimensions and `loading="lazy"` below the fold. The cards use layered forest-green backgrounds when photography cannot load. Never present these illustrative photographs as evidence of plantings by campaign participants.

## Responsiveness and interaction
Desktop (1366 px), tablet (768 px), phone (390 px), and narrow phone (320 px) widths are covered by the automated Chromium regression. At narrow widths the photographic cards stack vertically; the original foundation and CSS Vista logos remain legible; calls to action open the contributor sign-in/planting flow, leaderboard, and community gallery. The page respects `prefers-reduced-motion` and descriptive image alternative text.

## Website accountability
Only approved sapling reports increase campaign totals. All uploaded community photographs remain under existing consent and moderation rules, independent of these static promotional photographs.
