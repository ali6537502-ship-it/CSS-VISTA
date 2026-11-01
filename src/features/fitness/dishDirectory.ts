/**
 * Discovery-only directory of dish names and food families.
 * Catalog labels transcribed as titles (not instructions or nutrition data) from
 * https://pakistani.recipes/recipes/ (accessed November 2026).
 * The website lists 126 dish families, 346 recipe variations.
 * Listing a dish does NOT confer verified calories, allergen clearance,
 * ingredient weights or a licensed recipe.
 */
export const DISH_DIRECTORY_SOURCE='https://pakistani.recipes/recipes/'
export const DISH_DIRECTORY_GROUPS={
  "Main course": "Biryani|Nihari|Chicken Karahi|Haleem|Daal|Sajji|Paya|Korma|Qeema|Pulao|Mutton Karahi|Chicken Handi|Achar Gosht|Namkeen Gosht|Channay|Karahi Gosht|Shinwari Karahi|Safed Karahi|Katakat|Khausa|Dhansak|Dampukht|Mantu|Gushtaba|Rogan Josh|Sindhi Kadhi|Chicken Manchurian|Chowmein|Chicken Corn Soup|Hot and Sour Soup|Egg Fried Rice|Schezwan Chicken|Bannu Beef Pulao|Peshawari Siri Paye|Hareesa|Lahori Chargha|Tawa Chicken|Kadhi Pakora|Pallo Machli|Seyal Maani|Balochi Rosh|Khaddi Kabab|Landhi|Aloo Gosht",
  "Appetizer / BBQ": "Chapli Kebab|Seekh Kebab|Chicken Tikka|Shami Kebab|Chicken Malai Tikka|Malai Boti|Beef Boti|Tikka Boti|Gola Kebab|Bihari Kebab|Tabak Maaz|Honey Chilli Chicken|Salt and Pepper Chicken|Chicken Lollipop|Charsi Tikka",
  "Bread": "Naan|Paratha|Kaak|Roghni Naan|Garlic Naan|Keema Naan|Kashmiri Naan|Peshawari Naan|Kulcha|Sheermal|Bakarkhani|Taftan|Lachha Paratha|Chapati|Tandoori Roti|Missi Roti|Khameeri Roti|Makki Ki Roti|Bajra Roti|Rumali Roti|Mitho Lolo",
  "Breakfast": "Halwa Puri|Koki|Dal Pakwan|Mooli Paratha|Gobi Paratha|Keema Paratha|Anday Wala Paratha|Methi Paratha|Phitti",
  "Snack / street food": "Samosa|Pakora|Bun Kebab|Gol Gappay|Chana Chaat|Dahi Bhalla|Chapshuro|Spring Rolls|Dahi Baray Chaat|Aloo Tuk|Chicken Shawarma|Chicken Paratha Roll|Zinger Burger|Anda Shami Burger",
  "Dessert": "Gajar Ka Halwa|Kheer|Gulab Jamun|Jalebi|Rabri|Falooda|Sheer Khurma|Zarda|Sohan Halwa|Phirni|Shahi Tukda|Kulfi|Nankhatai|Besan Ka Halwa|Pinni|Karachi Halwa",
  "Beverage": "Lassi|Chai|Gurgur Chai|Kahwah",
  "Side dish": "Saag|Sai Bhaji|Bhee Aloo"
} as const
export type DishGroup=keyof typeof DISH_DIRECTORY_GROUPS
export type DishListing={id:string;name:string;group:DishGroup;reference:string}
const slug=(name:string)=>name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')
export const DISH_DIRECTORY:DishListing[]=Object.entries(DISH_DIRECTORY_GROUPS).flatMap(([group,names])=>
  names.split('|').map(name=>({id:'dish-'+slug(name),name,group:group as DishGroup,reference:DISH_DIRECTORY_SOURCE})))
export const searchDishDirectory=(query:string,group?:string)=>DISH_DIRECTORY.filter(d=>
 (!group || group==='All' || d.group===group) && d.name.toLowerCase().includes(query.trim().toLowerCase()))
