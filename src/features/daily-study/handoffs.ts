import type { CatalogItem } from './types'
export function writingDestination(course: CatalogItem) {
 if(course.canonicalDestination.startsWith('/account/preparation?view=topics&topic='))return course.canonicalDestination
 return ({'grammar-v5':'/account/expression?view=studio','expression-guide':'/account/expression?view=guide','gsa-tutor':'/account/gsa-tutor',precis:'/account/precis',essay:'/account/essay-builder',argument:'/account/argumentation',analysis:'/account/analytical-skills',sentence:'/account/expression?view=studio'}[course.id]||'/account/preparation?new=writing')
}
/** Navigation only; the native tool checks ownership and immutable writing versions. */
export function studyDestinations(course: CatalogItem, lesson?: string, work?: string) {
 const writing=work||lesson&&new URL(lesson,'https://www.css-vista.com').pathname===new URL(writingDestination(course),'https://www.css-vista.com').pathname&&lesson||writingDestination(course)
 const mode=(to:string,key:string,value:string)=>{const url=new URL(to,'https://www.css-vista.com');url.searchParams.set(key,value);return url.pathname+url.search+url.hash}
 const learn=lesson||course.canonicalDestination
 if(course.canonicalDestination.startsWith('/account/preparation?view=topics&topic='))return [learn,mode(writing,'topicMode','write'),mode(writing,'topicMode','check'),mode(writing,'topicMode','revise')]
 if(course.id==='precis')return [learn,mode(writing,'view','write'),mode(writing,'view','history'),mode(writing,'view','history')]
 return [learn,writing,work|| (course.id==='grammar-v5'?'/grammar-course?view=lab':writing),course.id==='grammar-v5'?'/grammar-course?view=lab':work||writing]
}
