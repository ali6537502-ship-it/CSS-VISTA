# CSS VISTA Personal Fitness Coach — evidence and release notes

**Status:** research-backed development draft; not a clinical device, not a licensed trainer, not live. Reviewed source inventory established 2026-11-01.

## 1. Food composition — what has genuinely been verified

The authoritative Pakistan-specific source is **Food Composition Table for Pakistan (Revised 2001)** by NWFP Agricultural University Peshawar, the Government of Pakistan and UNICEF, available from FAO INFOODS.

- Full scanned source: https://www.fao.org/fileadmin/templates/food_composition/documents/regional/Book_Food_Composition_Table_for_Pakistan_.pdf
- FAO country listing: https://www.fao.org/infoods/infoods/tables-and-databases/pakistan/en/
- Nutrient measures appear as **kcal and grams of protein per 100 g cooked, edible portion of a particular documented recipe**, in the traditional food section, printed pp. 48–52 (PDF pages 54–58 in zero-based screenshots). Every historical recipe has a recipe number and preparation appendix.
- The app records the 17 entries verbatim as numerical values; it does **not** call these universal calories for contemporary homemade or restaurant dishes. Chapati in the source is 282 kcal/100 g for its documented cooked reference recipe, whereas a different small roti made from 40g dry flour has a different weight and estimated value. Never conflate the two. Beef pulao is not automatically "Bannu pulao".
- All 17 verified entries are in `pakistanFoods.ts` with source URL, recipe number, quantity basis and historical-recipe flag.

| Traditional prepared food | Kcal / 100g | Protein / 100g |
|---|---:|---:|
| Chapati (documented recipe) | 282 | 9.7 |
| Masoor daal curry | 96 | 5.2 |
| Aloo gosht | 120 | 7.0 |
| Rajma curry | 162 | 11.7 |
| Kofta | 152 | 13.5 |
| Beef pulao | 179 | 11.0 |
| Shami kebab | 137 | 10.2 |
| Chapli kebab | 134 | 5.0 |
| Chicken curry | 167 | 9.8 |
| Haleem | 156 | 10.2 |
| Fried fish | 237 | 23.7 |
| Sajji | 157 | 17.2 |
| Biryani (meat and rice) | 197 | 9.1 |
| Suji halwa | 337 | 2.9 |
| Zarda | 246 | 4.5 |
| Kheer | 125 | 3.6 |
| Gajar halwa | 410 | 5.1 |

**Ingredient estimates** for eggs, milk, rice, nuts, bananas, etc. use common rounded reference quantities linked at the catalog level to USDA FoodData Central. Not every US reference serving has an individually pinned FDC food identifier yet; these are labelled as estimates rather than falsely verified Pakistan recipes. Primary catalog: https://fdc.nal.usda.gov/ ; data types and limitations https://fdc.nal.usda.gov/data-documentation/ ; download https://fdc.nal.usda.gov/download-datasets/ .

**Further release work:** map every generic ingredient to exact source IDs/edible weights, validate cooking yields, prepare a household recipe builder for variations (oil, spices, rice-to-meat ratio), verify allergen ingredient content, and check Pakistani regional dish measurements separately. No guessed calorie number for unnamed dishes.

## 2. Energy, targets and safety

- Mifflin MD et al., *A new predictive equation for resting energy expenditure in healthy individuals*, American Journal of Clinical Nutrition 51(2):241–247 (1990). https://pubmed.ncbi.nlm.nih.gov/2305711/ .
- Calculations: simplified male REE = 10 × kg + 6.25 × cm − 5 × age + 5; female reference = 10 × kg + 6.25 × cm − 5 × age − 161. Total daily energy = REE × an **approximate** self-selected activity multiplier. These are estimates, not measured metabolism.
- NIH/NIDDK Body Weight Planner: https://www.niddk.nih.gov/health-information/weight-management/body-weight-planner. The body adapts over time; no deterministic guarantee of a specified kg change in two months. The NIH model also excludes under-18s and pregnancy/breastfeeding from standard adult planning.
- CDC practical weight-loss advice https://www.cdc.gov/healthy-weight-growth/losing-weight/ — roughly 1–2 lb per week as a general guideline, with individual medical judgment. The draft coach conservatively flags weight loss above 0.75 kg/week, weight gain above 0.5 kg/week, and weight loss toward an underweight BMI.
- No calorie targets issued for selected relevant medical-review needs or flagged goals. The user may still see general educational information. The draft cannot verify a medical diagnosis, and does not prescribe individualized clinical care.
- Healthy, exercising adults: International Society of Sports Nutrition position stand https://pmc.ncbi.nlm.nih.gov/articles/PMC5477153/ finds ~1.4–2.0 g/kg/day generally sufficient for muscle maintenance/development during appropriate resistance training. For sedentary adults, distinct general recommendations apply.

## 3. Training evidence and demonstrations

- WHO activity guidance https://www.who.int/europe/news-room/fact-sheets/item/physical-activity : adults 150–300 minutes moderate aerobic weekly, or 75–150 vigorous; strength training major muscles on 2+ days. More sitting should be replaced with activity.
- NHS strength guidance https://www.nhs.uk/live-well/exercise/how-to-improve-strength-flexibility/ : bodyweight squats/pushups count as strengthening, begin gradually, use comfortable form.
- NHS technique videos https://www.nhs.uk/live-well/exercise/strength-and-flex-exercise-plan-how-to-videos/ : reviewed examples of warm-up, squat and standing press-up. Link to the NHS page; do not reproduce or embed copyrighted media without licensed permission.
- The current animations are original *schematic movement previews*, not validated 3D biomechanics, not measured repetition counters and not camera-based posture analysis. Professional motion-form validation and accessible animation upgrade are required for a full-quality launch.
- Users with injuries, pregnancy/postpartum considerations, medical concerns or unusual symptoms should receive appropriate screening and professional guidance; avoid exercises causing pain.

## 4. Privacy and operational deployment

- One existing CSS VISTA account; private `/account/fitness-coach` route. No new login, no extra database, no ad display in private health data.
- Local record includes matching `ownerId` and is stored in the existing progress-sync namespace. The coach only reads owner-matching records; production account storage and merge semantics require independent review, including shared-device scenarios and data deletion.
- Food availability can be changed per day without permanently changing the baseline food selections.
- Source status is visible; named foods not nutritionally pinned to a matching recipe should not be assigned a fabricated serving value.
- **Do not deploy** while the repo release hold remains. Run all tests/typecheck/lint/build, check mobile and authenticated browser flows, and complete privacy/security and clinician/trainer editorial review before release.
