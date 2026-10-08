# Free and Pro account workspaces

The existing `/account/dashboard` now presents **Free account** and **Pro account** options. Free is the initial view. `?plan=free` and `?plan=pro` preserve the selected view through refresh, browser history and account navigation. These are two views of the same native student account; the URL is not an entitlement.

Free shows the existing free preparation tools, resources, Vistagram, daily Current Affairs, tasks, Daily English, Grammar, free Précis resources, the General Ability question bank, practice/mocks, syllabus, essay themes and library. My Preparation includes the existing free attempt planner, coverage, reading/revision and writing records. Human mentor answer records remain free. The MPT portal card retains its existing feature-flag check.

Pro includes that identical free feature list, plus five starred destinations: Pro Topic Learning, Précis Mastery Lab, English Expression Lab, Handwritten Paragraph and Ask VISTA. The star is accompanied by visible `Pro` text. Shared account navigation, preparation shortcuts and the attempt topic tab also mark the relevant Pro destinations. Grammar, planning and human mentor records have not been reclassified as paid features.

The existing membership summary shows actual native membership status in the Pro view. Existing server-side profile, ownership, Pro expiry, CSRF and feature-availability checks remain authoritative. Selecting Pro does not create a payment, grant a membership, call an AI provider or enable collection. Previously earned private history remains available under its existing ownership rules.

## General Ability audit before the next course stage

This change adds an account link to the existing free bank; it does not implement a new maths course. The requested foundations-to-advanced teaching sequence is not present as a guided course.

The live-source bank at `public/mcq/cat-general-ability-*.json` contains 900 records used by `/mpt/bank/abilities`: arithmetic, HCF/LCM, fractions, ratio/proportion, percentages, averages, profit/loss, discount, work/rates, speed/distance/time and number-series/reasoning practice. Its labels include 400 `Number Series and Differences` records. Counts describe stored bank coverage, not academically reviewed lessons or unique tested concepts.

Additional arithmetic, algebra/equation and geometry questions exist in `public/css-subject-mcqs/general-science-and-ability.json`, exposed by `/css-mcqs`. The whole subject bank has 478 records, including science and reasoning; it must not be advertised as 478 maths questions. Its maths entries include equations, circle area, similar triangles, sphere-volume scaling and cylinder volume.

The existing legacy mock builder imports `curatedAbilityQuestions` from `src/data/mockCurated.ts`, including age problems, algebra, circles and mensuration. Other ability authoring files are not proof that their questions are reachable in the current independent bank. The current frozen MPT papers and students' histories are untouched.

`/one-liner-gk` has a 103-record General Ability formula/reference set, including decimals, circle/area, surface area and volume. These are quick notes, not a complete lesson path. Their extraction/notation needs review before reuse as course teaching.

The next authorised Ability stage needs a coherent progression covering number series; basic calculation; fractions and decimals; percentages; ratios and proportions; averages; profit, loss and discount; HCF/LCM; time/work; speed/distance/time; ages; word problems; algebra/equations; and geometry (circles, area, surface area and volume), with explanations, worked examples, exercises, feedback and quizzes. Existing scattered questions and formulas do not satisfy that course request.

## Validation

Lint, TypeScript, all 185 standard project tests and the strict Hostinger build passed. The generated artifact retains 98 registry routes, 1,020 indexable URLs and 60,136 resolved first-party links. No source bank, stored course, backend endpoint or migration changed.

The built app was verified with a synthetic native account in the disposable database: real sign-in, both choices, 15 identical free links in both views with the MPT flag enabled, five starred premium cards, refresh/back navigation, shared account links, actual free/active/expired membership, unchanged locked Précis content for a free user and opening the existing General Ability bank. Both views reflowed at 320, 390, 768, 1,024 and 1,440 pixels without overflow; no page errors or payment writes occurred. Production authentication and member content were not exercised with a synthetic account.
