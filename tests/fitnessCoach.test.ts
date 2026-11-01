import test from 'node:test'
import assert from 'node:assert/strict'
import { addWeeks, availableFoods, buildMeals, calculateEnergy, DEFAULT_FOODS, type FitnessProfile, validateProfile, workoutForDay } from '../src/features/fitness/model.ts'

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
