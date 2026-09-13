// Disposable CI identities only. Real password hashes never pass through CI.
import assert from 'node:assert/strict'
import { generateKeyPairSync, sign, randomUUID } from 'node:crypto'
import { copyFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
if (process.env.CI !== 'true' || process.env.CSSV_DB_NAME !== 'cssvista_briefing_test') throw new Error('Disposable CI database required')
const closed = await fetch('http://localhost:4173/api/account-migration.php', { method: 'POST' })
assert.equal(closed.status, 410)
assert.equal((await closed.json()).error, 'migration_closed')
copyFileSync('server/migration/account-migration.php', 'dist/api/account-migration-fixture.php')
copyFileSync('server/migration/_account_migration_map.php', 'dist/api/_account_migration_map.php')
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 3072 })
const pem = publicKey.export({type:'spki',format:'pem'})
writeFileSync('dist/api/_account_migration_key.php', `<?php return ['expires_at'=>'2099-01-01T00:00:00Z','scope'=>'ci-only','public_key'=><<<'PEM'\n${pem}PEM\n];`)
const origin='http://localhost:4173/api/'
async function send(body, valid=true) {
  const raw=JSON.stringify(body)
  const response=await fetch(origin+'account-migration-fixture.php',{method:'POST',headers:{'Content-Type':'application/json','X-CSSV-Migration-Signature':valid?sign('sha256',Buffer.from(raw),privateKey).toString('base64'):'invalid'},body:raw})
  return { status:response.status, body:await response.json() }
}
const password='TEST ONLY migration password'
const hash=execFileSync('php',['-r','echo password_hash($argv[1],PASSWORD_BCRYPT);',password],{encoding:'utf8'})
const id=randomUUID()
const row={id,email:'migration-test@example.invalid',password_hash:hash,email_verified_at:'2026-01-01T00:00:00Z',last_sign_in_at:null,raw_metadata:{full_name:'TEST ONLY'},created_at:'2026-01-01T00:00:00Z',disabled_at:null}
const payload={scope:'ci-only',batch_id:'ci-users',action:'import',dataset:'users',rows:[row]}
assert.equal((await send(payload,false)).status,401)
const imported=await send(payload)
assert.equal(imported.status,200,JSON.stringify(imported.body))
assert.equal(imported.body.inserted,1)
assert.equal(imported.body.reconciled,true)
assert.deepEqual((await send(payload)).body,imported.body)
assert.equal((await send({...payload,rows:[]})).status,409)
assert.equal((await send({...payload,batch_id:'ci-conflict',rows:[{...row,id:randomUUID()}]})).status,503)
const login=await fetch(origin+'auth/login.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:row.email,password})})
assert.equal(login.status,200)
assert.equal((await login.json()).user.id,id)
assert.equal((await send({scope:'ci-only',batch_id:'ci-seal',action:'seal'})).body.sealed,true)
assert.equal((await send(payload)).status,410)
assert.equal((await fetch(origin+'account-migration.php')).status,410)
console.log('PASS: signed migration, identical student ID/password, field reconciliation, replay safety, ownership conflict rollback and permanent seal.')
