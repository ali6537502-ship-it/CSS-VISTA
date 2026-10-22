import { CURRICULUM_VERSION, lessonItems, type Assessment, type Catalog, type Item, type Lesson } from './types'
const cache = new Map<string, Promise<unknown>>()
let editionHash = ''
async function read<T>(file: string): Promise<T> {
  const key = `/grammar/v5/${file}${file === 'index.json' || !editionHash ? '' : `?edition=${editionHash}`}`
  if (!cache.has(key)) cache.set(key, fetch(key, { cache: file === 'index.json' ? 'no-cache' : 'default' }).then(async response => {
    if (!response.ok) throw new Error('This learning resource could not be loaded. Your saved work is safe. Retry when the connection is available.')
    return response.json()
  }).catch(error => { cache.delete(key); throw error }))
  return cache.get(key) as Promise<T>
}
export async function loadCatalog(): Promise<Catalog> {
  const data = await read<Catalog>('index.json')
  if (data.version !== CURRICULUM_VERSION || data.days.length !== 30) throw new Error('The course index is unavailable. Please retry shortly.')
  editionHash = data.contentHash
  return data
}
export const loadLesson = (day: number) => read<Lesson>(`day-${String(day).padStart(2, '0')}.json`)
export const loadReference = (file: string) => read<Lesson>(`${file}.json`)
export async function loadAssessment(id: string): Promise<Assessment> {
  const data = await read<Assessment | Lesson>(`${id}.json`)
  return 'items' in data ? data : { id, title: data.title, orientation: data.orientation, items: lessonItems(data) }
}
export async function loadItem(catalog: Catalog, id: string): Promise<Item | undefined> {
  const q = catalog.items.find(q => q.id === id)
  if (!q) return
  return q.day ? lessonItems(await loadLesson(q.day)).find(q => q.id === id) : (await loadAssessment(q.group)).items.find(q => q.id === id)
}
export function conceptHref(concept: Catalog['concepts'][number], attempt?: string) {
  if (!concept.referenceFile) return dayHref(concept.day, concept.id, attempt)
  const p = new URLSearchParams({ view: 'reference', concept: concept.id }); if (attempt) p.set('attempt', attempt)
  return `/grammar-course?${p}`
}
export function dayHref(day: number, section = 'orientation', attempt?: string) {
  const p = new URLSearchParams({ day: String(day), section }); if (attempt) p.set('attempt', attempt)
  return `/grammar-course?${p}`
}
