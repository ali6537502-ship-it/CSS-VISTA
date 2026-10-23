# Feature homes and route compatibility

| Home | Entry | Existing authoritative destinations |
|---|---|---|
| Today | `/account/dashboard` | `?plan=free` and `?plan=pro` open the same account; recent-work resume preserves native IDs |
| Learn | `/account/learn` | `/account/preparation?view=topics`, all existing topic/attempt/section/mode/history/page/category/search parameters; `/account/general-ability`; Free `/grammar-course`, `/language-grammar`, `/grammar-vocabulary` |
| Write | `/account/writing` | `/account/preparation?writing=…`, `/account/expression` and `view=studio`, `/account/argumentation`, `/account/analytical-skills`, `/account/essay-builder`, `/account/precis`, `/account/handwriting`, `/account/answer-performance`; existing Essay Themes slugs |
| Review | `/account/review` | Native topic/reading due schedules; original Grammar lab, `/account/tasks`, preparation reviews remain linked |
| Library | `/account/library` | New `/account/library/search`; `/factbook` remains My Factbook with owned entry links; `/account/factbook` is Daily Facts; `/account/search` remains CA search; device records stay in original tools |
| Progress | `/account/progress` | Existing attempt continuation, domain first/latest histories; browser metrics explicitly labelled device-only/self-reported |

Utilities retain membership, profile, help, preparation context, usage and Ask VISTA destinations. `/study-planner` and all legacy routes remain registered. Public `/daily-briefing` and its API are unchanged. MPT/strategy hibernation is unchanged.

New account routes are private, noindex and ad-disabled in the canonical route registry. Search does not put private records in public bundles, HTML, sitemaps or a shared cache. Return paths use an explicit same-origin study allowlist and reject external/network-path/backslash/control-character and dot-segment action redirects.

Current limitations: course-level relationships use existing category metadata; a complete reviewed area/course/lesson breadcrumb graph and subject/freshness filters still require exact private catalog reconciliation. The due projection currently combines topic and reading schedules, while other domain review evidence remains in its owning workspace. No claim of full universal review or all smart collections is made.
