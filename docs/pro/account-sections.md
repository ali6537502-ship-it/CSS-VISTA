# Free and Pro account workspaces

The existing `/account/dashboard` now presents **Free account** and **Pro account** options. Free is the initial view. `?plan=free` and `?plan=pro` preserve the selected view through refresh, browser history and account navigation. These are two views of the same native student account; the URL is not an entitlement.

Free shows preparation planning, resources, Vistagram, tasks, Daily English, Grammar, practice/mocks, syllabus and library. Pro includes that identical free list plus nine starred destinations: Current Affairs, General Ability, My Answer Performance, Essay Themes, Pro Topic Learning, Précis Mastery Lab, English Expression Lab, Handwritten Paragraph and Ask VISTA. The MPT portal keeps its existing feature flag.

The owner's updated policy makes Précis teaching, practice, drafting and evaluation; General Ability study and quizzes; Essay Themes; My Answer Performance; and Current Affairs paid. These were formerly free in parts of the repository; that historical implementation no longer determines their classification. See [paid-feature-policy.md](paid-feature-policy.md) for the enforcement map. Grammar, free science, general planning and Vistagram remain free.

The existing membership summary shows actual native membership status in the Pro view. Existing server-side profile, ownership, Pro expiry, CSRF and feature-availability checks remain authoritative. Selecting Pro does not create a payment, grant a membership, call an AI provider or enable collection. Previously earned private history remains available under its existing ownership rules.

## General Ability audit before the next course stage

This change adds an account link to the existing bank, now under Pro access; it does not implement a new maths course. The requested foundations-to-advanced teaching sequence is not present as a guided course.

The live-source bank at `public/mcq/cat-general-ability-*.json` contains 900 records used by `/mpt/bank/abilities`: arithmetic, HCF/LCM, fractions, ratio/proportion, percentages, averages, profit/loss, discount, work/rates, speed/distance/time and number-series/reasoning practice. Its labels include 400 `Number Series and Differences` records. Counts describe stored bank coverage, not academically reviewed lessons or unique tested concepts.

Additional arithmetic, algebra/equation and geometry questions exist in `public/css-subject-mcqs/general-science-and-ability.json`, exposed by `/css-mcqs`. The whole subject bank has 478 records, including science and reasoning; it must not be advertised as 478 maths questions. Its maths entries include equations, circle area, similar triangles, sphere-volume scaling and cylinder volume.

The existing legacy mock builder imports `curatedAbilityQuestions` from `src/data/mockCurated.ts`, including age problems, algebra, circles and mensuration. Other ability authoring files are not proof that their questions are reachable in the current independent bank. The current frozen MPT papers and students' histories are untouched.

`/one-liner-gk` has a 103-record General Ability formula/reference set, including decimals, circle/area, surface area and volume. These are quick notes, not a complete lesson path. Their extraction/notation needs review before reuse as course teaching.

The next authorised Ability stage needs a coherent progression covering number series; basic calculation; fractions and decimals; percentages; ratios and proportions; averages; profit, loss and discount; HCF/LCM; time/work; speed/distance/time; ages; word problems; algebra/equations; and geometry (circles, area, surface area and volume), with explanations, worked examples, exercises, feedback and quizzes. Existing scattered questions and formulas do not satisfy that course request.

## Validation

See the paid-feature policy for the latest access and release checks. The original account separation passed desktop/mobile browser checks and the standard build/test suite; the revised paid policy additionally checks native APIs and direct resource delivery.
