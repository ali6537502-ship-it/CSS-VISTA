# CSS VISTA Fitness Coach — Goal-Oriented Food & Fitness System

**Development status:** Draft pull request #149, not live on CSS Vista. This document distinguishes implemented functionality from future releases.

## Product commitment
The user chooses a male-first or female calculation profile, enters adult age, measurements, activity, target weight, programme duration, foods normally available at home, optional restrictions, time for home training, preferred strength area and optional real daily food budget. The application keeps the student experience in three main areas: **My Diet / Workout / Progress**. Advanced features appear inside expandable sections, not as separate top-level navigation.

## Food-source integrity and reach
- **126 searchable Pakistani dish families** from a public Pakistani recipe-name index (covering 346 externally listed variations): `src/features/fitness/dishDirectory.ts`, https://pakistani.recipes/recipes/ . These are *discovery titles only*, not licensed full recipes, measurements, or verified nutritional values.
- **17 historical Pakistani cooked dishes with measured reference energy/protein** in `src/features/fitness/pakistanFoods.ts` from Food Composition Table for Pakistan (Revised 2001), available at https://www.fao.org/food-composition/tables-and-databases/detail/%28pakistan--2001%29-food-composition-table-for-pakistan/en. The values are for the source's prepared recipes per **100 g**, not universal prices or restaurant nutritional facts.
- Additional generic ingredient/food portions from standard nutrient references in `model.ts`, including FDC-ID-mapped raw onion, tomato, garlic, ginger, chilli, carrot and chicken to support family cooking calculations. Many earlier legacy rounded generic rows still need per-item identifier reviews before public launch.
- The open-ended **household recipe builder** lets users label any food (including any of the 126 titles), add only ingredients and reference portions they actually measure, record entire cooked yield in grams, per-serving grams and optional batch price. It calculates energy, protein, per-100g nutrient estimate, number of servings and cost per serving. The calculator never substitutes an unrelated recipe by name or copies copyrighted recipe instructions.
- Composite prepared foods are excluded under dietary restriction flags unless safely reviewed; known-ingredient recipe conflicts are blocked. Food allergy safety still requires actual ingredient labels and expert review.

## Goal-based functionality
- Target periods of 4, 8, 12, 24 weeks (two-month plan = 8 weeks).
- Conservative, approximate adult maintenance calorie, protein range and energy adjustment with review flags for rapid weight changes, underweight-loss goals, medical conditions and proposed intakes below 1,200 kcal/day.
- `buildMeals` selects only foods selected as generally available or specifically available today, rotates food options across the next seven days, and includes home recipes as one measured serving rather than applying an arbitrary 250 g quantity.
- Calorie/protein comparison highlights adequacy gaps, but does not claim automatic nutrient completeness from a partial ingredient catalog.
- Optional local prices can be added to reference ingredient portions and household recipe batches. Daily spending is assessed **only when every meal entry has a recorded price**; unknown prices never become guessed zeros. The application does not yet optimize purchases based on a constrained budget.
- Home strength/active-recovery routines, workout timers, simplified original motion figures, exercise-specific NHS/ACE technique links, and optional focus on chest/shoulders, legs or core. Not camera-based form tracking or licensed personal training.
- Weight and completed workout history, conservative weekly progress messages, and warnings about over-fast changes or unrealistic predictions.

## Important limits
This is not a comprehensive professional dietitian replacement. A dish-name catalog does not equal 346 authenticated, nutritionally complete written recipes. A user's unknown ingredient quantities cannot be assigned calories. A few rounded generic ingredient estimates are not proof that a particular home cooked batch matches that reference. Exercise figure quality and movement safety need a qualified trainer/physio review. The app cannot guarantee two-month weight or muscle outcomes.

## Required next product stages before release
1. Pin *every* generic ingredient to a checked specific nutrition dataset ID and raw/cooked state; expand locally relevant food materials through verified databases (including lentils, vegetables, spices, meats, cooking fats and fresh produce).
2. Expand the household recipe calculator to preserve ingredient state, user-specific edible yield, nutrient density changes and oil consumed vs discarded. Add a structured expert-reviewed Pakistani recipe pack only where ingredients are lawfully sourced and measured.
3. Verify allergy controls, privacy and household-profile account isolation with dedicated browser tests, data retention/deletion policies and account consent.
4. Improve individual exercise animations with professionally reviewed form demonstrations and actual intensity/difficulty progression. Do not claim body-camera pose coaching without actual pose analysis and its safety validation.
5. Validate logged meal history, dates, end-of-programme target behavior and calorie warnings in authenticated mobile and desktop browser sessions.
6. Complete TypeScript, lint, full test suite, Hostinger build and route/refresh checks on the current branch. Preserve `AGENTS.md` production release hold: do not merge to main without an explicit release instruction.

## References
- Pakistan Food Composition Table (2001): https://www.fao.org/fileadmin/templates/food_composition/documents/regional/Book_Food_Composition_Table_for_Pakistan_.pdf
- Pakistan Dietary Guidelines (2019): https://www.fao.org/pakistan/news/detail-events/en/c/1179182/
- USDA FoodData Central documentation and downloadable datasets: https://fdc.nal.usda.gov/data-documentation/ and https://fdc.nal.usda.gov/download-datasets/
- NIH/NIDDK adult goal-weight planner: https://www.niddk.nih.gov/health-information/weight-management/body-weight-planner
- WHO physical activity: https://www.who.int/initiatives/behealthy/physical-activity
- NICE 2025 weight-management diet safeguards: https://www.nice.org.uk/guidance/ng246/chapter/Physical-activity-and-diet
- NHS exercise technique videos: https://www.nhs.uk/live-well/exercise/strength-and-flex-exercise-plan-how-to-videos/
- International Society of Sports Nutrition protein position paper: https://pmc.ncbi.nlm.nih.gov/articles/PMC5477153/
- Pakistani dish-title discovery: https://pakistani.recipes/recipes/
