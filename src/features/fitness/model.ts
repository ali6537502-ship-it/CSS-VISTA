/** CSS VISTA Personal Fitness Coach: conservative adult estimates and food planning.
 * Nutrition numbers are approximate reference portions, NOT values for arbitrary Pakistani recipes.
 * Approximate ingredient composition: USDA FoodData Central (fdc.nal.usda.gov);
 * activity and energy estimates: Mifflin-St Jeor (1990), with heuristic activity factors.
 */
import { PAKISTANI_DISHES, PAKISTAN_FOOD_SOURCE } from './pakistanFoods'

export type Sex = 'male' | 'female'
export type Goal = 'gain' | 'lose' | 'muscle' | 'fitness'
export type Activity = 'sitting' | 'light' | 'moderate' | 'active'
export type Food = { id:string; label:string; portion:string; kcal:number; protein:number; group:string; source?:string; sourceUrl?:string; historicalRecipe?:boolean }
export type FitnessProfile = {
  sex:Sex; age:number; height:number; weight:number; target:number; weeks:number;
  goal:Goal; activity:Activity; minutes:number; available:string[];
  avoids:string[]; foodNotes:string; conditionReview:boolean; startDate:string
}
export type FitnessRecord = {
  ownerId:string; profile:FitnessProfile; updatedAt:string;
  weights:Array<{date:string;weight:number}>; workouts:Record<string,string>;
  meals:Record<string,Record<string,boolean>>;
  /** Each day can override typical home availability without changing the baseline. */
  dailyAvailability?:Record<string,Record<string,boolean>>
}
export const FOOD_REFERENCE = 'Ingredient entries are approximate USDA FoodData Central reference servings. Traditional prepared dishes use Pakistan’s 2001 food composition table per 100 g of a documented recipe. They are not universal restaurant or home-cooking values; oil, ingredients, serving mass and preparation change nutrition.'
export const FOODS:Food[] = [
  {id:'roti',label:'Plain homemade roti',portion:'1 (40 g dry atta, no oil)',kcal:136,protein:5,group:'Bread'},
  {id:'naan',label:'Plain naan',portion:'100 g',kcal:270,protein:9,group:'Bread'},
  {id:'bread',label:'Bread',portion:'2 slices (60 g)',kcal:159,protein:5.4,group:'Bread'},
  {id:'oats',label:'Oats',portion:'40 g dry',kcal:156,protein:6.8,group:'Bread'},
  {id:'rice',label:'Plain cooked rice',portion:'100 g',kcal:130,protein:2.7,group:'Rice'},
  {id:'potato',label:'Boiled potato',portion:'100 g',kcal:87,protein:1.9,group:'Rice'},
  {id:'eggs',label:'Boiled egg',portion:'1 large egg',kcal:78,protein:6.3,group:'Protein'},
  {id:'chicken',label:'Chicken, cooked skinless breast',portion:'100 g',kcal:165,protein:31,group:'Protein'},
  {id:'beef',label:'Lean beef, cooked',portion:'100 g',kcal:210,protein:27,group:'Protein'},
  {id:'fish',label:'Fish, cooked (lean)',portion:'100 g',kcal:128,protein:26,group:'Protein'},
  {id:'daal',label:'Plain cooked lentils (daal)',portion:'100 g, without added oil',kcal:116,protein:9,group:'Protein'},
  {id:'chana',label:'Boiled chickpeas (chana)',portion:'100 g',kcal:164,protein:8.9,group:'Protein'},
  {id:'lobia',label:'Boiled kidney beans / lobia',portion:'100 g',kcal:127,protein:8.7,group:'Protein'},
  {id:'paneer',label:'Paneer / fresh cheese',portion:'100 g (varies by recipe)',kcal:265,protein:18,group:'Protein'},
  {id:'milk',label:'Whole cow milk',portion:'250 ml',kcal:153,protein:8,group:'Dairy'},
  {id:'yogurt',label:'Plain whole milk yogurt / dahi',portion:'100 g',kcal:61,protein:3.5,group:'Dairy'},
  {id:'banana',label:'Banana',portion:'1 medium (118 g)',kcal:105,protein:1.3,group:'Fruit'},
  {id:'apple',label:'Apple',portion:'1 medium (182 g)',kcal:95,protein:0.5,group:'Fruit'},
  {id:'orange',label:'Orange',portion:'1 medium (131 g)',kcal:62,protein:1.2,group:'Fruit'},
  {id:'guava',label:'Guava',portion:'100 g',kcal:68,protein:2.6,group:'Fruit'},
  {id:'dates',label:'Dates',portion:'2 small (14 g)',kcal:40,protein:0.3,group:'Fruit'},
  {id:'vegetables',label:'Plain cooked mixed vegetables',portion:'100 g, no added oil',kcal:40,protein:2,group:'Vegetables'},
  {id:'spinach',label:'Boiled spinach / palak',portion:'100 g',kcal:23,protein:3,group:'Vegetables'},
  {id:'cucumber',label:'Cucumber',portion:'100 g',kcal:15,protein:0.7,group:'Vegetables'},
  {id:'peanuts',label:'Peanuts',portion:'15 g',kcal:85,protein:3.8,group:'Extras'},
  {id:'almonds',label:'Almonds',portion:'15 g',kcal:87,protein:3.2,group:'Extras'},
  {id:'oil',label:'Cooking oil (added to dish)',portion:'1 teaspoon (5 g)',kcal:45,protein:0,group:'Extras'},
  ...PAKISTANI_DISHES.map(d=>({
    id:d.id,label:d.label,portion:'100 g prepared food',kcal:d.kcalPer100g,
    protein:d.proteinPer100g,group:d.group,
    source:'Pakistan Food Composition Table (2001), recipe '+d.recipeNumber,
    sourceUrl:PAKISTAN_FOOD_SOURCE.url,historicalRecipe:true,
  })),
]
export const DEFAULT_FOODS = ['roti','rice','eggs','chicken','daal','chana','milk','yogurt','banana','vegetables','oil','apple','peanuts']
export const AVOID_OPTIONS = [
  {id:'wheat',name:'No wheat / gluten',exclude:['roti','naan','bread']},
  {id:'dairy',name:'No dairy',exclude:['milk','yogurt','paneer']},
  {id:'eggs',name:'No eggs',exclude:['eggs']},
  {id:'nuts',name:'No nuts / peanuts',exclude:['peanuts','almonds']},
]
export const FITNESS_KEY = 'cssvista:tool:fitness-coach:v1'
export function todayPK(date=new Date()) {
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Karachi',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date)
  const piece=(type:string)=>parts.find(p=>p.type===type)?.value||''
  return `${piece('year')}-${piece('month')}-${piece('day')}`
}
export function addWeeks(iso:string,weeks:number) {
  const date=new Date(iso+'T12:00:00Z')
  date.setUTCDate(date.getUTCDate()+weeks*7)
  return date.toISOString().slice(0,10)
}
export function availableFoods(profile:FitnessProfile,overrides:Record<string,boolean>={}) {
  const excludes=new Set(AVOID_OPTIONS.filter(option=>profile.avoids.includes(option.id)).flatMap(option=>option.exclude))
  return FOODS.filter(food=>{
    const selected=overrides[food.id] ?? profile.available.includes(food.id)
    if(!selected || excludes.has(food.id)) return false
    // Composite recipes have not been screened for every named allergen.
    // Unknown ingredient combinations are never silently assumed safe.
    if(profile.avoids.length && food.historicalRecipe) return false
    return true
  })
}
export function calculateEnergy(profile:FitnessProfile) {
  const bmi=profile.weight/Math.pow(profile.height/100,2)
  const resting=10*profile.weight+6.25*profile.height-5*profile.age+(profile.sex==='male'?5:-161)
  const factor={sitting:1.2,light:1.375,moderate:1.55,active:1.725}[profile.activity]
  const maintenance=Math.round(resting*factor)
  const rate=Math.abs(profile.target-profile.weight)/profile.weeks
  const direction=profile.goal==='lose' ? profile.target<profile.weight : profile.goal==='gain' ? profile.target>profile.weight : true
  const underweightLoss=profile.goal==='lose' && (bmi<18.5 || profile.target/Math.pow(profile.height/100,2)<18.5)
  const fast=(profile.goal==='lose'&&rate>0.75)||(profile.goal==='gain'&&rate>0.5)
  const needsReview=profile.conditionReview || !direction || underweightLoss || fast
  // These small initial adjustments are illustrative, not predictions of rate of change.
  const adjustment=profile.goal==='gain'?200:profile.goal==='lose'&&!underweightLoss?-Math.min(250,Math.round(maintenance*.12)):profile.goal==='muscle'?100:0
  const targetCalories=needsReview?null:maintenance+adjustment
  const proteinRange:[number,number]=profile.goal==='fitness'?[.8*profile.weight,1.2*profile.weight]:[1.4*profile.weight,2*profile.weight]
  return {bmi:Number(bmi.toFixed(1)),resting:Math.round(resting),maintenance,targetCalories,rate:Number(rate.toFixed(2)),
    direction,underweightLoss,fast,needsReview,
    proteinRange:proteinRange.map(n=>Math.round(n)) as [number,number]}
}
export type PlannedEntry = {food:Food; amount:number; kcal:number; protein:number}
export type PlannedMeal = {id:string;name:string;items:PlannedEntry[];kcal:number;protein:number}
const mealRules = [
  {id:'breakfast',name:'Breakfast',groups:[[['eggs',2],['yogurt',2],['daal',1.5],['chana',1.5]], [['roti',2],['bread',1],['oats',1],['rice',1.5]], [['milk',1],['banana',1],['guava',1]]]},
  {id:'lunch',name:'Lunch',groups:[[['chicken',1.5],['fish',1.5],['beef',1.2],['daal',2],['chana',2],['lobia',2],['paneer',.8],['eggs',2]], [['rice',2],['roti',2],['potato',2],['naan',1]], [['vegetables',1.5],['spinach',1.5],['cucumber',1]], [['oil',1]]]},
  {id:'snack',name:'Snack',groups:[[['yogurt',2],['milk',1],['chana',1]], [['banana',1],['apple',1],['orange',1],['guava',1],['dates',1]], [['peanuts',1],['almonds',1]]]},
  {id:'dinner',name:'Dinner',groups:[[['daal',2],['chana',2],['chicken',1.5],['fish',1.5],['beef',1.2],['eggs',2],['lobia',2],['paneer',.8]], [['roti',2],['rice',2],['naan',1],['potato',2]], [['vegetables',1.5],['spinach',1.5],['cucumber',1]], [['oil',1]]]},
] as const
export function buildMeals(profile:FitnessProfile,dayOverrides:Record<string,boolean>={},dayIndex=0) {
  const eligible=new Map(availableFoods(profile,dayOverrides).map(food=>[food.id,food]))
  const prepared=[...eligible.values()].filter(food=>food.group==='Cooked dishes')
  const mainDishIds=['pk-pulao','pk-biryani','pk-haleem']
  const plannedEnergy=calculateEnergy(profile).targetCalories
  const initialCalorieEstimate=mealRules.reduce((sum,rule)=>sum+rule.groups.reduce((groupSum,options)=>{
    const matched=options.find(([id])=>eligible.has(id))
    return groupSum+(matched?eligible.get(matched[0])!.kcal*matched[1]:0)
  },0),0)
  const portionFactor=plannedEnergy && initialCalorieEstimate>0?Math.max(.65,Math.min(1.3,plannedEnergy/initialCalorieEstimate)):1
  const meals:PlannedMeal[]=mealRules.map(rule=>{
    const items:PlannedEntry[]=[]
    const preparedDish=(rule.id==='lunch'||rule.id==='dinner')&&prepared.length
      ? prepared[(Math.abs(dayIndex)+(rule.id==='dinner'?1:0))%prepared.length] : null
    if(preparedDish){
      const quantity=2.5
      items.push({food:preparedDish,amount:quantity,kcal:Math.round(preparedDish.kcal*quantity),protein:Math.round(preparedDish.protein*quantity*10)/10})
      // One-plate rice dishes already include a cooked starch and oil.
      if(!mainDishIds.includes(preparedDish.id)){
        const starch=['roti','rice','potato'].map(id=>eligible.get(id)).find((item):item is Food=>!!item)
        if(starch)items.push({food:starch,amount:1.5,kcal:Math.round(starch.kcal*1.5),protein:Math.round(starch.protein*1.5*10)/10})
      }
      const veg=['vegetables','cucumber','spinach'].map(id=>eligible.get(id)).find((item):item is Food=>!!item)
      if(veg)items.push({food:veg,amount:1,kcal:veg.kcal,protein:veg.protein})
    }else for(const options of rule.groups){
      const matched=options.find(([id])=>eligible.has(id))
      if(matched){
        const food=eligible.get(matched[0])!
        const rawAmount=matched[1]*portionFactor
        const amount=food.id==='eggs'?Math.max(1,Math.round(rawAmount)):Math.max(.25,Math.round(rawAmount*4)/4)
        items.push({food,amount,kcal:Math.round(food.kcal*amount),protein:Math.round(food.protein*amount*10)/10})
      }
    }
    return {id:rule.id,name:rule.name,items,kcal:items.reduce((sum,item)=>sum+item.kcal,0),protein:Math.round(items.reduce((sum,item)=>sum+item.protein,0))}
  })
  return {meals,totalCalories:meals.reduce((s,m)=>s+m.kcal,0),
    totalProtein:meals.reduce((s,m)=>s+m.protein,0),
    varietyWarning:meals.some(meal=>meal.items.length<2),
    sourceWarning:meals.some(meal=>meal.items.some(item=>item.food.historicalRecipe))}
  
}
export type Exercise={id:string;name:string;instruction:string;kind:'stand'|'squat'|'push'|'floor'|'lunge';seconds:number;techniqueUrl?:string}
const routines:Record<string,Exercise[]> = {
  A:[
    {id:'march',name:'March in place',instruction:'Move at a comfortable pace and breathe normally.',kind:'stand',seconds:45},
    {id:'squat',name:'Chair-supported squats',instruction:'Sit back toward a stable chair. Keep your feet planted and move through a comfortable range.',kind:'squat',seconds:40},
    {id:'wallpush',name:'Wall push-ups',instruction:'Keep your body in a straight line; bend your elbows toward the wall, then push away.',kind:'push',seconds:40},
    {id:'bridge',name:'Glute bridges',instruction:'Lie on your back with knees bent. Raise hips gently, without arching the lower back.',kind:'floor',seconds:40},
    {id:'bird',name:'Bird dog',instruction:'From hands and knees, extend opposite arm and leg with control, then switch.',kind:'floor',seconds:40},
  ],
  B:[
    {id:'walk',name:'March in place',instruction:'Start slowly and gradually increase pace if comfortable.',kind:'stand',seconds:45},
    {id:'lunge',name:'Supported reverse lunges',instruction:'Hold a stable surface for balance; step back and bend knees only as far as comfortable.',kind:'lunge',seconds:40},
    {id:'push',name:'Incline or knee push-ups',instruction:'Use a stable raised support or knees. Keep shoulders controlled and avoid sagging.',kind:'push',seconds:40},
    {id:'calf',name:'Calf raises',instruction:'Raise onto toes and lower slowly. Hold stable support if needed.',kind:'stand',seconds:40},
    {id:'plank',name:'Modified plank',instruction:'Hold a braced position on knees or forearms while breathing normally.',kind:'floor',seconds:30},
  ]
}
/** Public technique pages; do not hotlink or rehost their proprietary media. */
const EXERCISE_TECHNIQUE:Record<string,string>={
  squat:'https://www.nhs.uk/live-well/exercise/strength-and-flex-exercise-plan-how-to-videos/',
  wallpush:'https://www.nhs.uk/live-well/exercise/strength-and-flex-exercise-plan-how-to-videos/',
  bridge:'https://www.nth.nhs.uk/resources/lower-limb-exercise-and-education/',
  bird:'https://www.acefitness.org/resources/everyone/exercise-library/14/bird-dog/',
  calf:'https://www.nth.nhs.uk/resources/lower-limb-exercise-and-education/',
  push:'https://www.nhs.uk/live-well/exercise/how-to-improve-strength-flexibility/',
}
export function workoutForDay(week:number,dayIndex:number,minutes:number,goal:Goal){
  const strengthDay=[0,2,4].includes(((dayIndex%7)+7)%7)
  const exerciseList=strengthDay?routines[dayIndex%2===0?'A':'B']:[
    {id:'recovery-walk',name:'Gentle marching or walking',instruction:'Walk at a comfortable pace; stop or slow down if you feel unwell.',kind:'stand' as const,seconds:60},
    {id:'recovery-mobility',name:'Standing mobility',instruction:'Move shoulders and hips slowly through a comfortable, pain-free range.',kind:'stand' as const,seconds:40},
    {id:'recovery-calf',name:'Supported calf raises',instruction:'Hold a stable surface; lift heels gently, then lower slowly.',kind:'stand' as const,seconds:40},
  ]
  const totalSets=strengthDay?(minutes<=10?1:minutes<=20?2:3):1
  const workBoost=Math.min(10,Math.max(0,week-1)*2)
  return {exercises:exerciseList.map(e=>({...e,techniqueUrl:EXERCISE_TECHNIQUE[e.id],seconds:e.seconds+(strengthDay?workBoost:0)+(strengthDay&&goal==='lose'&&e.kind==='stand'?10:0)})),sets:totalSets,restSeconds:30,strengthDay}
}
export function validateProfile(profile:FitnessProfile):string|null {
  if(!Number.isInteger(profile.age)||profile.age<18||profile.age>80) return 'This version is for adults aged 18–80.'
  if(profile.height<125||profile.height>220||profile.weight<35||profile.weight>250) return 'Please review your height and weight.'
  if(profile.target<35||profile.target>250) return 'Please select a target weight within the supported range.'
  if(![4,8,12,24].includes(profile.weeks)) return 'Please select a supported duration.'
  if((profile.goal==='gain'&&profile.target<=profile.weight)||(profile.goal==='lose'&&profile.target>=profile.weight)) return 'Your target weight must match your selected goal.'
  if(!availableFoods(profile).length) return 'Choose at least one food you can eat.'
  return null
}
