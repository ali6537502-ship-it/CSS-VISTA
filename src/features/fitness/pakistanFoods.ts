/**
 * Pakistan Food Composition Table (revised 2001), "Traditional Foods" section.
 * Department of Agricultural Chemistry, NWFP Agricultural University Peshawar;
 * UNICEF Islamabad; Ministry of Planning and Development, Government of Pakistan.
 * Hosted by FAO INFOODS. Source values reported per 100g of edible cooked recipe.
 *
 * IMPORTANT: Recipe-specific historical reference values, not modern restaurant
 * averages. These must not be presented as a universal figure for every preparation.
 * Homemade recipes and ingredients should be checked individually.
 */
export const PAKISTAN_FOOD_SOURCE = {
  id:'pakistan-fct-2001',
  title:'Food Composition Table for Pakistan (Revised 2001), traditional foods pp. 48–52',
  url:'https://www.fao.org/fileadmin/templates/food_composition/documents/regional/Book_Food_Composition_Table_for_Pakistan_.pdf',
  publisher:'Government of Pakistan / NWFP Agricultural University / UNICEF; hosted by FAO INFOODS',
  year:2001,
} as const

export type PakistaniDish={
  id:string; label:string; kcalPer100g:number; proteinPer100g:number;
  group:'Bread'|'Cooked dishes'|'Dessert'; recipeNumber:number;
  /** Raw composition as transcribed from the named source, not extrapolated. */
}
export const PAKISTANI_DISHES:PakistaniDish[]=[
  {id:'pk-chapati',label:'Chapati (Pakistan table recipe)',kcalPer100g:282,proteinPer100g:9.7,group:'Bread',recipeNumber:1},
  {id:'pk-masoor-curry',label:'Daal masoor curry',kcalPer100g:96,proteinPer100g:5.2,group:'Cooked dishes',recipeNumber:2},
  {id:'pk-aloo-gosht',label:'Aloo gosht (beef and potato)',kcalPer100g:120,proteinPer100g:7.0,group:'Cooked dishes',recipeNumber:3},
  {id:'pk-rajma',label:'Rajma (kidney bean curry)',kcalPer100g:162,proteinPer100g:11.7,group:'Cooked dishes',recipeNumber:4},
  {id:'pk-kofta',label:'Kofta meatballs',kcalPer100g:152,proteinPer100g:13.5,group:'Cooked dishes',recipeNumber:5},
  {id:'pk-pulao',label:'Beef pulao (pulao gosht)',kcalPer100g:179,proteinPer100g:11.0,group:'Cooked dishes',recipeNumber:6},
  {id:'pk-shami',label:'Shami kebab',kcalPer100g:137,proteinPer100g:10.2,group:'Cooked dishes',recipeNumber:7},
  {id:'pk-chapli',label:'Chapli kebab',kcalPer100g:134,proteinPer100g:5.0,group:'Cooked dishes',recipeNumber:8},
  {id:'pk-chicken-curry',label:'Chicken curry / chicken salan',kcalPer100g:167,proteinPer100g:9.8,group:'Cooked dishes',recipeNumber:9},
  {id:'pk-haleem',label:'Haleem',kcalPer100g:156,proteinPer100g:10.2,group:'Cooked dishes',recipeNumber:10},
  {id:'pk-fried-fish',label:'Fried fish',kcalPer100g:237,proteinPer100g:23.7,group:'Cooked dishes',recipeNumber:11},
  {id:'pk-sajji',label:'Sajji (roasted meat)',kcalPer100g:157,proteinPer100g:17.2,group:'Cooked dishes',recipeNumber:12},
  {id:'pk-biryani',label:'Biryani (rice with meat)',kcalPer100g:197,proteinPer100g:9.1,group:'Cooked dishes',recipeNumber:13},
  {id:'pk-suji-halwa',label:'Suji halwa',kcalPer100g:337,proteinPer100g:2.9,group:'Dessert',recipeNumber:14},
  {id:'pk-zarda',label:'Zarda sweet rice',kcalPer100g:246,proteinPer100g:4.5,group:'Dessert',recipeNumber:15},
  {id:'pk-kheer',label:'Kheer rice pudding',kcalPer100g:125,proteinPer100g:3.6,group:'Dessert',recipeNumber:16},
  {id:'pk-gajar-halwa',label:'Gajar halwa',kcalPer100g:410,proteinPer100g:5.1,group:'Dessert',recipeNumber:17},
]
