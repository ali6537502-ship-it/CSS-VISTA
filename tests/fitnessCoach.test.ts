import test from 'node:test'
import assert from 'node:assert/strict'
import { addWeeks, availableFoods, buildMeals, calculateEnergy, DEFAULT_FOODS, FOODS, type FitnessProfile, validateProfile, workoutForDay, weightTrendGuidance } from '../src/features/fitness/model.ts'
import { PAKISTAN_FOOD_SOURCE, PAKISTANI_DISHES } from '../src/features/fitness/pakistanFoods.ts'

const base:FitnessProfile={sex:'male',age:25,height:170,weight:60,target:65,weeks:8,goal:'gain',activity:'sitting',minutes:20,available:DEFAULT_FOODS,avoids:[],foodNotes:'',conditionReview:false,startDate:'2026-11-01'}

test('two-month target uses 8 weeks and returns conservative adult energy estimate',()=>{
  const energy=calculateEnergy(base)
  assert.ok(energy.resting>1300 && energy.resting<1900)
  assert.equal(energy.rate,0.63)
  // 5 kg in 8 weeks is above the conservative automatic gain pace.
  assert.equal(energy.targetCalories,null)
  assert.equal(energy.needsReview,true)
  assert.equal(addWeeks(base.startDate,8),'2026-12-27')
})
test('realistic gain pace can receive an illustrative calorie estimate',()=>{
  const energy=calculateEnergy({...base,target:62})
  assert.equal(energy.rate,.25)
  assert.equal(energy.targetCalories,energy.maintenance+200)
  assert.ok(energy.proteinRange[0]>=84)
})
test('loss recommendations are withheld for an underweight body or target',()=>{
  const profile={...base,goal:'lose' as const,weight:50,target:47}
  assert.equal(calculateEnergy(profile).underweightLoss,true)
  assert.equal(calculateEnergy(profile).targetCalories,null)
})
test('medical review withholds personalised calorie target',()=>{
  const energy=calculateEnergy({...base,target:62,conditionReview:true})
  assert.equal(energy.targetCalories,null)
})
test('male and female reference calculations differ while goals remain unrestricted',()=>{
  const male=calculateEnergy({...base,target:62})
  const female=calculateEnergy({...base,sex:'female',target:62})
  assert.ok(male.resting>female.resting)
})
test('restricted items are filtered even if ticked available',()=>{
  const p={...base,avoids:['dairy','wheat','nuts']}
  const ids=availableFoods(p).map(f=>f.id)
  for(const id of ['roti','milk','yogurt','peanuts']) assert.equal(ids.includes(id),false)
})
test('meals contain only available, unrestricted foods and totals sum',()=>{
  const p={...base,target:62,available:['roti','eggs','daal','banana','vegetables'],avoids:['eggs']}
  const plan=buildMeals(p)
  assert.equal(plan.meals.length,4)
  assert.equal(plan.totalCalories,plan.meals.reduce((sum,meal)=>sum+meal.kcal,0))
  assert.equal(plan.meals.flatMap(m=>m.items).some(item=>item.food.id==='eggs'),false)
  assert.equal(plan.meals.flatMap(m=>m.items).some(item=>!p.available.includes(item.food.id)),false)
})
test('adult inputs and target direction validated',()=>{
  assert.match(validateProfile({...base,age:17})||'',/adults/)
  assert.match(validateProfile({...base,goal:'lose',target:70})||'',/match/)
  assert.equal(validateProfile({...base,target:62}),null)
})
test('the workout provides basic movements and scales volume with time',()=>{
  const beginner=workoutForDay(1,0,10,'gain')
  const longer=workoutForDay(4,2,30,'muscle')
  assert.equal(beginner.sets,1)
  assert.equal(longer.sets,3)
  assert.equal(workoutForDay(2,1,30,'muscle').strengthDay,false)
  assert.equal(workoutForDay(2,1,30,'muscle').sets,1)
  assert.ok(longer.exercises.length>=4)
  assert.ok(longer.exercises.every(e=>e.seconds>0&&e.instruction.length>20))
})

test('Pakistan food composition source contains exactly the 17 historically measured dishes',()=>{
  assert.equal(PAKISTANI_DISHES.length,17)
  assert.ok(PAKISTAN_FOOD_SOURCE.url.startsWith('https://www.fao.org/'))
  const biryani=PAKISTANI_DISHES.find(f=>f.id==='pk-biryani')
  assert.equal(biryani?.kcalPer100g,197)
  assert.equal(biryani?.proteinPer100g,9.1)
  const daal=PAKISTANI_DISHES.find(f=>f.id==='pk-masoor-curry')
  assert.equal(daal?.kcalPer100g,96)
  assert.equal(daal?.proteinPer100g,5.2)
  assert.equal(PAKISTANI_DISHES.find(f=>f.id==='pk-pulao')?.kcalPer100g,179)
  const ids=FOODS.map(f=>f.id)
  assert.equal(new Set(ids).size,ids.length)
  assert.ok(FOODS.some(f=>f.id==='pk-kheer'&&f.historicalRecipe&&f.sourceUrl))
})

test('daily meal override does not require changing permanent home foods',()=>{
  const p={...base,target:62,available:['eggs','roti','daal','banana']}
  const normal=buildMeals(p)
  assert.ok(normal.meals.flatMap(m=>m.items).some(item=>item.food.id==='eggs'))
  const switched=buildMeals(p,{eggs:false,chicken:true})
  assert.equal(switched.meals.flatMap(m=>m.items).some(item=>item.food.id==='eggs'),false)
  assert.ok(switched.meals.flatMap(m=>m.items).some(item=>item.food.id==='chicken'))
  assert.ok(p.available.includes('eggs'))
  assert.equal(p.available.includes('chicken'),false)
})

test('traditional one-plate dishes do not double-count added rice or cooking oil',()=>{
  const p={...base,target:62,available:['roti','rice','pk-biryani','vegetables']}
  const lunch=buildMeals(p,{},0).meals.find(m=>m.id==='lunch')
  assert.ok(lunch?.items.some(i=>i.food.id==='pk-biryani'))
  assert.equal(lunch?.items.some(i=>i.food.id==='rice'),false)
  assert.equal(lunch?.items.some(i=>i.food.id==='oil'),false)
})

test('prepared meals are suppressed when ingredient allergens have not been checked',()=>{
  const p={...base,avoids:['wheat'],available:['pk-biryani','pk-chicken-curry','rice','eggs']}
  const foods=availableFoods(p)
  assert.equal(foods.some(f=>f.historicalRecipe),false)
  assert.ok(foods.some(f=>f.id==='rice'))
  const menu=buildMeals(p)
  assert.equal(menu.meals.flatMap(m=>m.items).some(i=>i.food.historicalRecipe),false)
})

test('weekly review requires enough elapsed time and never guarantees a target date',()=>{
  assert.match(weightTrendGuidance(base,[{date:'2026-11-01',weight:60}]),/Log your weight/)
  assert.match(weightTrendGuidance(base,[{date:'2026-11-01',weight:60},{date:'2026-11-03',weight:60.5}]),/less than a week/)
  assert.match(weightTrendGuidance(base,[{date:'2026-11-01',weight:60},{date:'2026-11-15',weight:60.4}]),/gradual weight gain/)
  assert.match(weightTrendGuidance({...base,goal:'lose',target:57},[{date:'2026-11-01',weight:60},{date:'2026-11-15',weight:58.8}]),/gradual weight reduction/)
  assert.match(weightTrendGuidance({...base,goal:'muscle'},[{date:'2026-11-01',weight:60},{date:'2026-11-15',weight:60.5}]),/Weight alone cannot/)
})

test('very low intake from reference equations is not issued as an unsupervised target',()=>{
  const p={...base,sex:'female' as const,age:80,height:125,weight:35,target:36,weeks:8,activity:'sitting' as const}
  const energy=calculateEnergy(p)
  assert.equal(energy.lowIntake,true)
  assert.equal(energy.targetCalories,null)
  assert.equal(energy.needsReview,true)
})
test('home workout prioritises user-selected focus without removing full body activity',()=>{
  const chest=workoutForDay(1,0,20,'muscle','chest-shoulders')
  const legs=workoutForDay(1,0,20,'gain','legs')
  assert.equal(chest.exercises[1].kind,'push')
  assert.equal(legs.exercises[1].kind,'squat')
  assert.equal(chest.exercises.length,legs.exercises.length)
})
