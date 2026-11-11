const paths = new Set(['/account/dashboard','/account/preparation','/account/expression','/account/argumentation','/account/analytical-skills','/account/essay-builder','/account/precis','/account/gsa-tutor','/account/practice','/account/progress','/account/subjects','/grammar-course','/mistakes','/answer-writing','/answer-timer'])
export function safeStudyDestination(value: string | null | undefined, fallback = '/account/dashboard'): string {
 if(!value||!value.startsWith('/')||value.startsWith('//')||value.includes('\\')||Array.from(value).some(char => char.charCodeAt(0) <= 32))return fallback
 try { const url=new URL(value,'https://www.css-vista.com');return url.origin==='https://www.css-vista.com'&&paths.has(url.pathname)?url.pathname+url.search+url.hash:fallback }catch{return fallback}
}
