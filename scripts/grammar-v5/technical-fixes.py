import pathlib
r=pathlib.Path(__file__).resolve().parents[2]
def edit(file, old, new):
 p=r/file;s=p.read_text();assert old in s,(file,old[:80]);p.write_text(s.replace(old,new))
edit('src/features/grammar-v5/types.ts','export interface Catalog { version: string;','export interface Catalog { version: string; contentHash: string;')
edit('src/features/grammar-v5/content.ts',"const cache = new Map<string, Promise<unknown>>()", "const cache = new Map<string, Promise<unknown>>()\nlet editionHash = ''")
edit('src/features/grammar-v5/content.ts',"const key = `/grammar/v5/${file}`", "const key = `/grammar/v5/${file}${file === 'index.json' || !editionHash ? '' : `?edition=${editionHash}`}`")
edit('src/features/grammar-v5/content.ts',"fetch(key).then(async response =>", "fetch(key, { cache: file === 'index.json' ? 'no-cache' : 'default' }).then(async response =>")
edit('src/features/grammar-v5/content.ts',"  return data\n}","  editionHash = data.contentHash\n  return data\n}")
edit('src/features/grammar-v5/state.ts',"  const value = storage.getItem(key) ?? (!user ? storage.getItem('cssvista:grammar-course:v3') : null)\n  if (value !== null) storage.setItem(backup, JSON.stringify({ sourceKey: key, value,", "  const current = storage.getItem(key), sourceKey = current !== null ? key : !user ? 'cssvista:grammar-course:v3' : key\n  const value = current ?? (!user ? storage.getItem(sourceKey) : null)\n  if (value !== null) storage.setItem(backup, JSON.stringify({ sourceKey, value,")
edit('src/features/grammar-v5/state.ts',"const retained = seen.filter(q => (state.reviews[q.id]?.streak ?? 0) >= 2).length", "const retained = seen.filter(q => { const r = state.reviews[q.id]; return r && r.streak - (state.answers[q.id].first === q.answer && !r.lapses ? 1 : 0) >= 2 }).length")
edit('src/features/grammar-v5/LessonView.tsx',"({ section, index: 0 })","({ section: '', index: 0 })")
edit('src/features/grammar-v5/LessonView.tsx',"  function moveItem(index: number)","  useEffect(() => {\n    update(s => s.cursor.day === day && s.cursor.section === safeSection ? s : { ...s, cursor: { day, section: safeSection, item: '' } })\n  }, [day, safeSection, update])\n  function moveItem(index: number)")
edit('src/features/grammar-v5/Course.tsx',"import { dayHref, loadCatalog }", "import { conceptHref, dayHref, loadCatalog }")
edit('src/features/grammar-v5/Course.tsx','<main className="mx-auto max-w-7xl px-4 py-6 sm:py-8">','<div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">')
edit('src/features/grammar-v5/Course.tsx','    </main>','    </div>')
edit('src/features/grammar-v5/Course.tsx',"onClick={() => navigate(next.day, next.section)}", "onClick={() => weak[0]?.referenceFile ? route('reference', { concept: weak[0].id }) : navigate(next.day, next.section)}")
edit('src/features/grammar-v5/Course.tsx','to={dayHref(c.day, c.id, attempt)}','to={conceptHref(c, attempt)}')
edit('src/features/grammar-v5/ConceptView.tsx',"to={dayHref(lesson.day, 'questions', attempt)}", "to={catalog.concepts.find(c => c.id === concept.id)?.referenceFile ? `/grammar-course?view=lab&mode=${catalog.concepts.find(c => c.id === concept.id)!.referenceFile}${attempt ? `&attempt=${attempt}` : ''}` : dayHref(lesson.day, 'questions', attempt)}")
# Saves return the canonical preserved state, including idempotent replays.
edit('public/api/_grammar_v5.php',"$result=['attempt_id'=>$attempt,'version'=>$version];", "$result=['attempt_id'=>$attempt,'version'=>$version,'state'=>$state];")
edit('public/api/_grammar_v5_core.php'," foreach(['completed','studied'] as $key)"," foreach($old['reviews'] as $id=>$review)if(!isset($next['reviews'][$id]) || $next['reviews'][$id]['lastAt']<$review['lastAt'])$next['reviews'][$id]=$review;\n foreach(['completed','studied'] as $key)")
