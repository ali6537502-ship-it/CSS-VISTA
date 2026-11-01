import test from 'node:test'
import assert from 'node:assert/strict'
import { DISH_DIRECTORY, DISH_DIRECTORY_GROUPS, searchDishDirectory } from '../src/features/fitness/dishDirectory.ts'
import { estimateHomeRecipe,recipeAsFood,recipeFoods,recipeRestrictionConflicts,estimateDailyFoodCost,type HomeRecipe } from '../src/features/fitness/recipeEngine.ts'
import { buildMeals,FOODS,type FitnessProfile } from '../src/features/fitness/model.ts'
const base:FitnessProfile={
  sex:'male',age:25,height:170,weight:65,target:67,weeks:8,goal:'gain',activity:'sitting',
  minutes:20,available:['rice','vegetables','chicken-raw'],avoids:[],foodNotes:'',startDate:'2026-11-02',conditionReview:false,budgetPkr:600
}
const recipe:HomeRecipe={
  id:'home-example',name:'Measured family chicken dish',
  ingredients:[{foodId:'chicken-raw',portions:2},{foodId:'onion-raw',portions:1},{foodId:'tomato-raw',portions:1},{foodId:'oil',portions:2}],
  cookedYieldGrams:400,servingGrams:200,batchCostPkr:400,createdAt:'2026-11-02T00:00:00Z',
}
test('126 indexed dish names from eight verified categories, without invented nutrition',()=>{
  assert.equal(DISH_DIRECTORY.length,126)
  assert.equal(Object.keys(DISH_DIRECTORY_GROUPS).length,8)
  assert.equal(new Set(DISH_DIRECTORY.map(d=>d.id)).size,126)
  assert.ok(searchDishDirectory('bannu').some(d=>d.name==='Bannu Beef Pulao'))
  assert.ok(searchDishDirectory('chapli').some(d=>d.name==='Chapli Kebab'))
  assert.equal('calories' in DISH_DIRECTORY[0],false)
})
test('reference portion recipe formula respects measured cooked yield',()=>{
  const value=estimateHomeRecipe(recipe)
  assert.ok(value)
  assert.equal(value!.totalCalories,388)
  assert.equal(value!.caloriesPerServing,194)
  assert.equal(value!.caloriesPer100g,97)
  assert.equal(value!.costPerServingPkr,200)
  assert.equal(value!.servingsPerBatch,2)
  assert.ok(value!.proteinPerServing>23)
})
test('unsafe recipe inputs and unknown food IDs are rejected',()=>{
  assert.equal(estimateHomeRecipe({...recipe,ingredients:[{foodId:'unknown',portions:1}]}),null)
  assert.equal(estimateHomeRecipe({...recipe,servingGrams:500}),null)
  assert.equal(estimateHomeRecipe({...recipe,cookedYieldGrams:0}),null)
  assert.equal(estimateHomeRecipe({...recipe,ingredients:[]}),null)
  assert.equal(estimateHomeRecipe({...recipe,batchCostPkr:-20}),null)
})
test('allergen restrictions prevent a flagged recipe from entering meal plans',()=>{
  const wheatRecipe={...recipe,ingredients:[...recipe.ingredients,{foodId:'roti',portions:1}]}
  assert.deepEqual(recipeRestrictionConflicts(wheatRecipe,['wheat']),['No wheat / gluten'])
  const allergyProfile={...base,avoids:['wheat']}
  assert.equal(recipeAsFood(wheatRecipe,allergyProfile),null)
  assert.equal(recipeFoods([wheatRecipe],allergyProfile).length,0)
})
test('user recipe joins planning as a single measured serving rather than arbitrary 250g reference dish',()=>{
  const profile={...base,available:[...base.available,recipe.id]}
  const customFoods=recipeFoods([recipe],profile)
  assert.equal(customFoods.length,1)
  assert.equal(customFoods[0].kcal,194)
  assert.equal(customFoods[0].costPkr,200)
  const menu=buildMeals(profile,{},0,customFoods)
  const lunch=menu.meals.find(m=>m.id==='lunch')
  assert.ok(lunch?.items.some(i=>i.food.id===recipe.id))
  assert.equal(lunch?.items.find(i=>i.food.id===recipe.id)?.amount,1)
  assert.equal(menu.meals.flatMap(m=>m.items).some(i=>!Number.isFinite(i.kcal)),false)
})
test('daily switches exclude a home recipe without removing it permanently',()=>{
  const profile={...base,available:[...base.available,recipe.id]}
  const customFoods=recipeFoods([recipe],profile)
  assert.ok(buildMeals(profile,{},0,customFoods).meals.some(m=>m.items.some(i=>i.food.id===recipe.id)))
  assert.equal(buildMeals(profile,{[recipe.id]:false},0,customFoods).meals.some(m=>m.items.some(i=>i.food.id===recipe.id)),false)
})
test('local budget never claims a price-complete menu with unknown prices',()=>{
  const profile={...base,available:[...base.available,recipe.id]}
  const menu=buildMeals(profile,{},0,recipeFoods([recipe],profile))
  const unknown=estimateDailyFoodCost(menu.meals,{},base.budgetPkr)
  assert.equal(unknown.complete,false)
  assert.equal(unknown.underBudget,null)
  const prices=Object.fromEntries(FOODS.map(f=>[f.id,50]))
  const assessed=estimateDailyFoodCost(menu.meals,prices,base.budgetPkr)
  assert.equal(assessed.complete,true)
  assert.equal(typeof assessed.underBudget,'boolean')
})
test('7-day plan rotates available breakfast ingredients, not only meal labels',()=>{
  const profile={...base,available:['eggs','yogurt','daal','chana','rice','roti','banana','milk','vegetables']}
  const first=buildMeals(profile,{},0)
  const second=buildMeals(profile,{},1)
  assert.notDeepEqual(first.meals[0].items.map(i=>i.food.id),second.meals[0].items.map(i=>i.food.id))
})

test('empty menus cannot be incorrectly labelled affordable',()=>{
  const result=estimateDailyFoodCost([{id:'breakfast',name:'Breakfast',items:[],kcal:0,protein:0}],{},500)
  assert.equal(result.complete,false)
  assert.equal(result.underBudget,null)
})
