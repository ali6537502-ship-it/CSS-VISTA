import type { Food, FitnessProfile, PlannedMeal } from './model'
import { FOODS, AVOID_OPTIONS } from './model'

/**
 * Recipes created from recorded, measurable ingredients.
 * Never infer ingredient quantities merely from a dish name.
 * Recipe name is a user label; the numbers derive only from entered portions.
 */
export type HomeIngredient={foodId:string; portions:number}
export type HomeRecipe={
  id:string; name:string; ingredients:HomeIngredient[];
  /** Total cooked recipe, measured by user, after cooking / water loss. */
  cookedYieldGrams:number;
  servingGrams:number;
  /** Optional household purchase cost for entire recipe (not an external price). */
  batchCostPkr?:number;
  createdAt:string;
  foodCategory?:string;
}
export type RecipeEstimate={
  caloriesPerServing:number; proteinPerServing:number;
  caloriesPer100g:number; proteinPer100g:number; servingsPerBatch:number;
  totalCalories:number; totalProtein:number; costPerServingPkr?:number;
  ingredients:Array<{food:Food;portions:number}>;
}

export const RECIPE_INGREDIENTS = FOODS.filter(food=>!food.historicalRecipe && food.group!=='Cooked dishes' && food.group!=='Dessert')
export function estimateHomeRecipe(recipe:HomeRecipe):RecipeEstimate|null {
  if(!recipe || !recipe.name.trim() || recipe.name.length>120 || !Array.isArray(recipe.ingredients)
    ||recipe.ingredients.length===0 || recipe.ingredients.length>35 || !Number.isFinite(recipe.cookedYieldGrams)
    ||recipe.cookedYieldGrams<50 || recipe.cookedYieldGrams>25000 || !Number.isFinite(recipe.servingGrams)
    ||recipe.servingGrams<10 ||recipe.servingGrams>recipe.cookedYieldGrams) return null
  const list:RecipeEstimate['ingredients']=[]
  let calories=0,protein=0
  for(const entry of recipe.ingredients){
    const food=RECIPE_INGREDIENTS.find(f=>f.id===entry.foodId)
    if(!food || !Number.isFinite(entry.portions)||entry.portions<=0||entry.portions>100) return null
    list.push({food,portions:entry.portions})
    calories+=food.kcal*entry.portions
    protein+=food.protein*entry.portions
  }
  if(!Number.isFinite(calories)||!Number.isFinite(protein)||calories<=0)return null
  const factor=recipe.servingGrams/recipe.cookedYieldGrams
  const costValid=recipe.batchCostPkr===undefined || (Number.isFinite(recipe.batchCostPkr)&&recipe.batchCostPkr>=0&&recipe.batchCostPkr<=1000000)
  if(!costValid)return null
  return {caloriesPerServing:Math.round(calories*factor),proteinPerServing:Math.round(protein*factor*10)/10,
    caloriesPer100g:Math.round(calories*100/recipe.cookedYieldGrams),
    proteinPer100g:Math.round(protein*1000/recipe.cookedYieldGrams)/10,
    servingsPerBatch:Math.round(recipe.cookedYieldGrams/recipe.servingGrams*10)/10,
    totalCalories:Math.round(calories),totalProtein:Math.round(protein*10)/10,
    costPerServingPkr:recipe.batchCostPkr===undefined?undefined:Math.round(recipe.batchCostPkr*factor),
    ingredients:list}
}
export function recipeRestrictionConflicts(recipe:HomeRecipe,avoids:string[]):string[] {
  if(!avoids.length)return []
  const ids=new Set(recipe.ingredients.map(i=>i.foodId))
  return AVOID_OPTIONS.filter(o=>avoids.includes(o.id)&&o.exclude.some(id=>ids.has(id))).map(o=>o.name)
}
export function recipeAsFood(recipe:HomeRecipe,profile:FitnessProfile):Food|null {
  const estimated=estimateHomeRecipe(recipe)
  if(!estimated || recipeRestrictionConflicts(recipe,profile.avoids).length)return null
  // A home cooked dish may contain unlisted allergens or cross-contact.
  // The UI always requires the user to check actual ingredients.
  return {id:recipe.id,label:recipe.name,portion:recipe.servingGrams+' g per home serving',
    kcal:estimated.caloriesPerServing,protein:estimated.proteinPerServing,
    group:'Cooked dishes',source:'User-entered ingredient portions; estimated from reference entries',
    customRecipe:true,includesStarch:recipe.ingredients.some(i=>['roti','rice','potato','bread','naan','oats'].includes(i.foodId)),
    costPkr:estimated.costPerServingPkr}
}
export function recipeFoods(recipes:HomeRecipe[],profile:FitnessProfile):Food[] {
  if(!Array.isArray(recipes))return []
  return recipes.slice(0,100).map(recipe=>recipeAsFood(recipe,profile)).filter((v):v is Food=>!!v)
}
export type BudgetResult={costPkr:number; missing:string[]; complete:boolean; underBudget:boolean|null}
export function estimateDailyFoodCost(meals:PlannedMeal[],prices:Record<string,number>,budgetPkr?:number):BudgetResult {
  const missing:string[]=[],seen=new Set<string>()
  let cost=0
  for(const meal of meals)for(const item of meal.items){
    const price=prices[item.food.id]??item.food.costPkr
    if(!Number.isFinite(price)||price===undefined||price<0){
      if(!seen.has(item.food.id)){missing.push(item.food.label);seen.add(item.food.id)}
    }else cost+=price*item.amount
  }
  const hasFood=meals.some(meal=>meal.items.length>0)
  if(!hasFood)missing.push('No meals available')
  const complete=hasFood&&missing.length===0
  return {costPkr:Math.round(cost),missing,complete,underBudget:complete&&Number.isFinite(budgetPkr)&&budgetPkr!==undefined?cost<=budgetPkr!:null}
}
