import assert from 'node:assert/strict'
import test from 'node:test'
import { safeStudyReturn, workspaceDestinations, workspaceHome } from '../../src/features/workspace/navigation.ts'
test('six primary homes retain canonical account entries', () => {
  assert.deepEqual(workspaceDestinations.map(item => item.id), ['today','learn','write','review','library','progress'])
  for (const path of ['/account/precis','/account/expression','/account/argumentation','/account/answer-performance']) assert.equal(workspaceHome(path)?.id,'write')
  assert.equal(workspaceHome('/account/library/search')?.id,'library')
})
test('study returns reject redirects, decoding tricks and non-study actions', () => {
  for (const value of ['https://example.invalid','//example.invalid','/\\evil','/account/../api/admin/topics.php','/account/%2e%2e/api/admin/topics.php','/account/logout','/sadiaali','/account/library/search\n','/%2f%2fevil']) assert.equal(safeStudyReturn(value),'/account/dashboard',value)
  const exact='/account/preparation?view=topics&attempt=opaque&topic=test&topicSection=three&topicMode=guided&topicHistory=1&topicPage=2&topicCategory=economy&topicSearch=trade'
  assert.equal(safeStudyReturn(exact),exact)
  assert.equal(safeStudyReturn('/factbook?entry=opaque'),'/factbook?entry=opaque')
})

test('pending recovery stays account-scoped and preserves original request bytes', async () => {
  const { preparationRecovery } = await import('../../src/features/workspace/recovery.ts')
  const user='00000000-0000-4000-8000-000000000001', attempt='00000000-0000-4000-8000-000000000002'
  const values=new Map([
    [`cssvista:attempt-action:${user}:${attempt}:topics.php`, JSON.stringify({user,attempt,body:{topic_id:'test-only-topic',draft:'  original text  '}})],
    [`cssvista:attempt-action:other:${attempt}`, JSON.stringify({user:'other',attempt})],
  ])
  const before=JSON.stringify([...values])
  const storage={length:values.size,key:(i:number)=>[...values.keys()][i]||null,getItem:(key:string)=>values.get(key)||null}
  assert.equal(preparationRecovery(storage,user).length,1)
  assert.ok(preparationRecovery(storage,user)[0].to.includes('topic=test-only-topic'))
  assert.equal(preparationRecovery(storage,'foreign').length,0)
  assert.equal(JSON.stringify([...values]),before)
})
