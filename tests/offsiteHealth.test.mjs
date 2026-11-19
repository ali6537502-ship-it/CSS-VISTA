import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, chmodSync, rmSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..')
const file=join(root,'server/bin/cssv-offsite-health.sh')
const syntax=spawnSync('bash',['-n',file],{encoding:'utf8'})
test('backup freshness monitor passes bash syntax',()=>assert.equal(syntax.status,0,syntax.stderr))

function run(ageHours,repo='s3:https://example.invalid/vista-backups'){
 const folder=mkdtempSync(join(tmpdir(),'cssvista-health-'))
 try{
  const bin=join(folder,'bin');mkdirSync(bin)
  const pass=join(folder,'password');writeFileSync(pass,'disposable-fixture-only')
  const restic=join(bin,'restic')
  writeFileSync(restic,'#!/usr/bin/env bash\nprintf "%s\\n" "$MOCK_RESTIC_JSON"\n')
  chmodSync(restic,0o700)
  const time=new Date(Date.now()-ageHours*3600*1000).toISOString()
  const env={
   PATH:bin+':'+process.env.PATH,HOME:folder,
   CSSV_BACKUP_REPOSITORY:repo,
   CSSV_BACKUP_PASSWORD_FILE:pass,
   CSSV_BACKUP_MAX_AGE_HOURS:'30',
   MOCK_RESTIC_JSON:JSON.stringify([{id:'fixture',time,tags:['cssvista']}])
  }
  return spawnSync('bash',[file],{encoding:'utf8',env,timeout:10000})
 }finally{rmSync(folder,{recursive:true,force:true})}
}

test('healthy recent remote snapshot is recognized',()=>{
 const p=run(0.5)
 assert.equal(p.status,0,p.stderr)
 assert.match(p.stdout,/CSSV_BACKUP_HEALTH_OK/)
})

test('old backup fails closed before it is too late to recover',()=>{
 const p=run(72)
 assert.notEqual(p.status,0)
 assert.match(p.stderr,/exceeds the maximum backup age/)
})

test('a local repository is never accepted as independent backup',()=>{
 const p=run(0, '/tmp/not-offsite')
 assert.notEqual(p.status,0)
 assert.match(p.stderr,/off-host/)
})
