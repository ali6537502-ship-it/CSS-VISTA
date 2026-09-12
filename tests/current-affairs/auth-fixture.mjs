import { createServer } from 'node:http'
import { randomUUID, randomBytes } from 'node:crypto'
if (process.env.CI !== 'true' || process.env.CSSV_DB_NAME !== 'cssvista_briefing_test') throw new Error('Isolated CI database required')
const users = new Map(), tokens = new Map()
createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json')
  let raw = ''; for await (const chunk of req) raw += chunk
  const body = raw ? JSON.parse(raw) : {}
  const path = new URL(req.url, 'http://127.0.0.1:54321').pathname
  const send = (data, status = 200) => { res.writeHead(status); res.end(JSON.stringify(data)) }
  if (path === '/test/create') {
    const user = { id: randomUUID(), email: body.email, created_at: new Date().toISOString(), email_confirmed_at: new Date().toISOString(), user_metadata: { full_name: 'TEST Student' } }
    const access_token = randomBytes(32).toString('hex')
    users.set(user.id, user); tokens.set(access_token, user)
    send({ user, access_token }); return
  }
  if (path === '/auth/v1/user') {
    const user = tokens.get((req.headers.authorization || '').replace(/^Bearer /, ''))
    send(user || { message: 'Invalid token' }, user ? 200 : 401); return
  }
  send({ ok: true })
}).listen(54321, '127.0.0.1', () => console.log('Isolated identity verifier ready.'))
