import { useMemo, useState, type FormEvent } from 'react'
import { BookOpen, Calculator, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { DISH_DIRECTORY, DISH_DIRECTORY_GROUPS, searchDishDirectory } from './dishDirectory'
import { RECIPE_INGREDIENTS, estimateHomeRecipe, recipeRestrictionConflicts, type HomeRecipe } from './recipeEngine'
import { FOODS, type FitnessProfile } from './model'

const inputClass='min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-emerald-700'
const groups=['All',...Object.keys(DISH_DIRECTORY_GROUPS)] as string[]
const blank=(name=''):HomeRecipe=>({
  id:'home-'+(typeof crypto!=='undefined'&&'randomUUID'in crypto?crypto.randomUUID():Date.now().toString(36)),
  name,ingredients:[],cookedYieldGrams:0,servingGrams:0,createdAt:new Date().toISOString(),
})

export function HomeFoodStudio({profile,recipes,onSave,onRemove,onPriceUpdate,prices}:{
  profile:FitnessProfile;recipes:HomeRecipe[];
  onSave:(recipe:HomeRecipe)=>void;onRemove:(id:string)=>void;
  onPriceUpdate:(foodId:string,cost?:number)=>void;prices:Record<string,number>;
}){
  const [dishSearch,setDishSearch]=useState('')
  const [category,setCategory]=useState('All')
  const [draft,setDraft]=useState<HomeRecipe>(()=>blank())
  const [foodId,setFoodId]=useState('chicken')
  const [portions,setPortions]=useState('1')
  const [cost,setCost]=useState('')
  const [error,setError]=useState('')
  const [message,setMessage]=useState('')
  const results=useMemo(()=>searchDishDirectory(dishSearch,category).slice(0,30),[dishSearch,category])
  const estimated=estimateHomeRecipe(draft)
  const conflicts=recipeRestrictionConflicts(draft,profile.avoids)
  function addIngredient(){
    const n=Number(portions)
    if(!RECIPE_INGREDIENTS.some(f=>f.id===foodId)||!Number.isFinite(n)||n<=0||n>100){setError('Enter a valid ingredient and quantity.');return}
    setDraft(current=>({...current,ingredients:current.ingredients.some(e=>e.foodId===foodId)
      ?current.ingredients.map(e=>e.foodId===foodId?{...e,portions:Math.min(100,Math.round((e.portions+n)*100)/100)}:e)
      :[...current.ingredients,{foodId,portions:n}]}))
    setError('')
  }
  function saveRecipe(event:FormEvent<HTMLFormElement>){
    event.preventDefault()
    const batchCost=cost.trim()===''?undefined:Number(cost)
    const recipe:HomeRecipe={...draft,name:draft.name.trim(),batchCostPkr:batchCost}
    const nutrition=estimateHomeRecipe(recipe)
    if(!nutrition){setError('Enter a recipe name, measurable ingredients, cooked batch weight and serving size. Check all quantities.');return}
    if(conflicts.length){setError('This recipe conflicts with selected restrictions: '+conflicts.join(', ')+'.');return}
    if(recipes.length>=80){setError('The current version supports up to 80 saved household recipes.');return}
    onSave(recipe)
    setMessage(recipe.name+' saved for your home-food choices. Nutrients are estimated, not laboratory measured.')
    setError('');setDraft(blank());setCost('')
  }
  return <section className="space-y-4">
    <div className="rounded-2xl border bg-white p-4 sm:p-5">
      <div className="mb-3 flex items-start gap-3"><BookOpen size={24} className="shrink-0 text-emerald-800"/><div><h3 className="font-bold">Pakistani food directory</h3><p className="text-sm leading-6 text-slate-600">{DISH_DIRECTORY.length} indexed dish families. Search for a dish, then record how your family prepares it. Names alone do not provide verified calories or ingredients.</p></div></div>
      <div className="grid gap-2 sm:grid-cols-[1fr_175px]"><input type="search" aria-label="Search Pakistani dishes" className={inputClass} value={dishSearch} onChange={e=>setDishSearch(e.target.value)} placeholder="Bannu pulao, daal, karahi, saag…"/><select aria-label="Food category" className={inputClass} value={category} onChange={e=>setCategory(e.target.value)}>{groups.map(g=><option value={g} key={g}>{g}</option>)}</select></div>
      <p className="mt-2 text-xs text-slate-500">Showing {results.length} of {searchDishDirectory(dishSearch,category).length} matching names.</p>
      <div className="mt-3 grid max-h-80 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">{results.map(dish=><button key={dish.id} type="button" className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2 text-left text-sm hover:bg-emerald-50" onClick={()=>{setDraft(v=>({...v,name:dish.name}));setError('');setMessage('Add the actual ingredients your household uses.')}}><span>{dish.name}<span className="block text-[11px] text-slate-500">{dish.group}</span></span><ChevronRight size={15} className="text-emerald-800"/></button>)}</div>
      <p className="mt-2 text-xs text-slate-500">Dish-name reference: <a className="underline text-emerald-900" href="https://pakistani.recipes/recipes/" target="_blank" rel="noopener noreferrer">Pakistani Recipes directory</a>. No copyrighted recipe instructions are reproduced.</p>
    </div>
    <form onSubmit={saveRecipe} className="space-y-4 rounded-2xl border bg-white p-4 sm:p-5">
      <div className="flex items-center gap-2"><Calculator size={22} className="text-emerald-800"/><h3 className="font-bold">Calculate my home-cooked dish</h3></div>
      <label className="block text-sm font-semibold">Dish name<input required maxLength={120} className={inputClass+' mt-1'} placeholder="e.g. Our chicken karahi" value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></label>
      <p className="text-xs text-slate-600">Record each ingredient you used. Reference quantities appear in the selector. Remember cooking oil, toppings and dairy.</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_120px_auto]">
        <select className={inputClass} value={foodId} onChange={e=>setFoodId(e.target.value)} aria-label="Recipe ingredient">{RECIPE_INGREDIENTS.map(food=><option value={food.id} key={food.id}>{food.label} — {food.portion}</option>)}</select>
        <input className={inputClass} type="number" aria-label="Number of reference portions" value={portions} onChange={e=>setPortions(e.target.value)} min=".05" max="100" step=".05"/>
        <button type="button" onClick={addIngredient} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl border border-emerald-900/20 px-4 text-sm font-semibold text-emerald-900"><Plus size={16}/> Add</button>
      </div>
      {draft.ingredients.length>0&&<div className="space-y-1">{draft.ingredients.map((ingredient,i)=>{const entry=RECIPE_INGREDIENTS.find(f=>f.id===ingredient.foodId);return <div key={ingredient.foodId} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm"><span>{entry?.label} · {ingredient.portions} × {entry?.portion}</span><button type="button" onClick={()=>setDraft(v=>({...v,ingredients:v.ingredients.filter((_,k)=>k!==i)}))} aria-label={'Remove '+entry?.label} className="min-h-10 min-w-10 rounded-lg text-red-700"><Trash2 size={15} className="mx-auto"/></button></div>})}</div>}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-semibold">Total cooked dish weight (g)<input required className={inputClass+' mt-1'} type="number" min="50" max="25000" step="1" value={draft.cookedYieldGrams||''} onChange={e=>setDraft({...draft,cookedYieldGrams:Number(e.target.value)})} placeholder="e.g. 1200"/></label>
        <label className="block text-sm font-semibold">Weight per serving (g)<input required className={inputClass+' mt-1'} type="number" min="10" max="25000" step="1" value={draft.servingGrams||''} onChange={e=>setDraft({...draft,servingGrams:Number(e.target.value)})} placeholder="e.g. 300"/></label>
      </div>
      <label className="block text-sm font-semibold">Entire batch cost in PKR (optional)<input className={inputClass+' mt-1'} type="number" min="0" max="1000000" step="1" value={cost} onChange={e=>setCost(e.target.value)} placeholder="Your actual household cost"/></label>
      {estimated&&<div role="status" className="rounded-xl bg-emerald-50 p-4"><p className="text-xs font-semibold uppercase tracking-wider text-emerald-900">Estimated home serving</p><p className="mt-1 text-xl font-bold text-emerald-950">{estimated.caloriesPerServing} kcal · {estimated.proteinPerServing} g protein</p><p className="mt-1 text-xs text-emerald-900">{draft.servingGrams} g · {estimated.caloriesPer100g} kcal per 100 g · approximately {estimated.servingsPerBatch} servings from batch{cost!==''?' · PKR '+Math.round(Number(cost)*draft.servingGrams/draft.cookedYieldGrams)+' per serving':''}</p></div>}
      {conflicts.length>0&&<p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Ingredient restriction conflict: {conflicts.join(', ')}. Check ingredients and cross-contact.</p>}
      {error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {message&&<p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">{message}</p>}
      <button type="submit" className="min-h-12 w-full rounded-xl bg-emerald-900 px-4 font-semibold text-white">Save my household recipe</button>
      <p className="text-xs leading-5 text-slate-500">Estimates depend on accurate ingredient reference portions and cooked yield. Water, absorbed oil, discarded cooking liquid, raw versus cooked weights and missing ingredients change nutrition. Do not use this as a clinical nutrition assessment.</p>
    </form>
    {recipes.length>0&&<div className="rounded-2xl border bg-white p-4"><h3 className="font-bold">My saved household recipes ({recipes.length})</h3>
      <div className="mt-3 space-y-2">{recipes.map(recipe=>{const e=estimateHomeRecipe(recipe);return <div className="flex items-center justify-between gap-2 rounded-xl border p-3" key={recipe.id}><div><p className="text-sm font-semibold">{recipe.name}</p><p className="text-xs text-slate-500">{e?e.caloriesPerServing+' kcal, '+e.proteinPerServing+' g protein · '+recipe.servingGrams+' g serving':'Needs recipe review'}</p></div><button type="button" aria-label={'Delete '+recipe.name} onClick={()=>onRemove(recipe.id)} className="min-h-11 min-w-11 rounded-lg border text-red-700"><Trash2 size={16} className="mx-auto"/></button></div>})}</div>
    </div>}
    <details className="rounded-2xl border bg-white p-4"><summary className="cursor-pointer font-bold">Enter my local food prices</summary>
      <p className="mt-2 text-sm text-slate-600">Enter only prices you know, for the stated reference portion. Costs vary by household and season.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">{FOODS.filter(f=>profile.available.includes(f.id)&&!f.historicalRecipe).map(food=><label key={food.id} className="block text-xs font-semibold">{food.label} · {food.portion}<input className={inputClass+' mt-1'} type="number" step="1" min="0" max="100000" placeholder="PKR per reference serving" value={prices[food.id]??''} onChange={e=>{const n=e.target.value;onPriceUpdate(food.id,n.trim()===''?undefined:Number(n))}}/></label>)}</div>
    </details>
  </section>
}
