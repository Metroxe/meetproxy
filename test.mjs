// End-to-end test against a running server (start it with WORKER=0 so the support worker stays quiet):
// WORKER=0 ROOM_SERVICE_KEY=testkey node server.mjs & ROOM_SERVICE_KEY=testkey node test.mjs
import pg from 'pg'
const BASE = process.env.BASE ?? 'http://localhost:8791'
const db = new pg.Pool({ connectionString: process.env.DATABASE_URL ?? 'postgres://meetproxy:meetproxy@localhost:5435/meetproxy' })
let failed = 0
const ok = (name, cond, extra = '') => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : '  ' + extra}`); if (!cond) failed++ }
const call = async (path, init = {}) => { const r = await fetch(BASE + path, init); return { status: r.status, text: await r.text(), headers: r.headers } }
const form = (o) => ({ method: 'POST', body: new URLSearchParams(o), headers: { 'content-type': 'application/x-www-form-urlencoded' } })
const idOf = (t) => t.match(/\/r\/([0-9a-f]{24})/)[1]
const grab = (t, label) => t.match(new RegExp(label + '[^:]*: ([0-9a-f]{32})'))?.[1]

// unlisted room, created the way an agent would
let r = await call('/new', form({ goal: 'fix checkout 500s', expires: '24h', visibility: 'unlisted', as: 'acme' }))
ok('create unlisted', r.status === 201 && r.text.includes('ROOM CREATED') && r.text.includes('PROMPT FOR THE OTHER SIDE'), r.text)
const id = idOf(r.text); const owner = grab(r.text, 'Owner key')
ok('prompt carries goal + curl commands', r.text.includes('fix checkout 500s') && r.text.includes(`/r/${id}/messages?after=0&wait=25`))
r = await call(`/r/${id}/messages?as=acme`, { method: 'POST', body: 'checkout 500s since deploy 41 & "quotes"', headers: { 'content-type': 'application/x-www-form-urlencoded' } })
ok('post raw body (curl --data-binary default type)', r.text.trim() === 'posted #1', r.text)
const t0 = Date.now(); const pollP = call(`/r/${id}/messages?after=1&wait=20`)
setTimeout(() => call(`/r/${id}/say?as=chris&text=${encodeURIComponent('on it')}`), 1500)
r = await pollP
ok('long-poll wakes on new message', r.text.includes('on it') && Date.now() - t0 < 6000, r.text)
r = await call(`/r/${id}/messages?after=0`)
ok('transcript has both, ordered', r.text.indexOf('#1 [acme') < r.text.indexOf('#2 [chris') && r.text.includes('& "quotes"'), r.text)
r = await call(`/r/${id}`, { headers: { accept: 'text/html' } })
ok('html page for browsers', r.text.includes('<title>CorgiPay Support') && r.text.includes('Copy prompt'))
r = await call(`/r/${id}`)
ok('plain text view for agents', r.text.startsWith('You are joining a live support chat'))

// owner controls
r = await call(`/r/${id}/manage`, form({ action: 'close' }))
ok('manage without owner key is refused', r.status === 403, r.text)
r = await call(`/r/${id}/manage?key=${owner}`, form({ action: 'close' }))
ok('owner closes room', r.text.trim() === 'closed', r.text)
r = await call(`/r/${id}/say?as=x&text=hi`)
ok('closed room refuses posts', r.status === 409, r.text)
r = await call(`/r/${id}/messages?after=0`)
ok('closed room still readable and says so', r.text.includes('ROOM CLOSED'))
await call(`/r/${id}/manage?key=${owner}`, form({ action: 'reopen' }))
r = await call(`/r/${id}/say?as=x&text=back`)
ok('reopen allows posts again', r.text.trim() === 'posted #3', r.text)

// password room
r = await call('/new', form({ goal: 'secret job', visibility: 'password', password: 'hunter22', expires: '1h' }))
const pid = idOf(r.text)
ok('password room created, prompt includes key', r.text.includes('key=hunter22'))
r = await call(`/r/${pid}/messages`); ok('password room: no key -> 401', r.status === 401, r.text)
r = await call(`/r/${pid}/messages?key=nope`); ok('password room: wrong key -> 401', r.status === 401)
r = await call(`/r/${pid}/say?as=a&text=hello&key=hunter22`); ok('password room: right key posts', r.text.trim() === 'posted #1', r.text)
r = await call(`/r/${pid}/messages?after=0`, { headers: { 'x-room-key': 'hunter22' } }); ok('password via header reads', r.text.includes('hello'))
r = await call(`/r/${pid}`, { headers: { accept: 'text/html' } }); ok('browser sees lock form', r.status === 401 && r.text.includes('needs a password'))
r = await call(`/r/${pid}?key=hunter22`, { headers: { accept: 'text/html' }, redirect: 'manual' })
ok('browser key sets cookie + redirects', r.status === 303 && (r.headers.get('set-cookie') ?? '').includes(`k_${pid}=hunter22`))

// private room with invites
r = await call('/new', form({ goal: 'nda work', visibility: 'private', as: 'chris' }))
const vid = idOf(r.text); const vowner = grab(r.text, 'Owner key')
const guestKey = r.text.match(/PROMPT FOR THE OTHER SIDE[\s\S]*?key=([0-9a-f]{32})/)[1]
ok('private room created with a guest invite', !!guestKey)
r = await call(`/r/${vid}/messages`); ok('private: no key -> 401', r.status === 401)
r = await call(`/r/${vid}/say?as=g&text=hi&key=${guestKey}`); ok('private: invite key posts', r.text.trim() === 'posted #1', r.text)
r = await call(`/r/${vid}/manage?key=${vowner}`, form({ action: 'invite', name: 'third' })); ok('owner mints another invite', r.status === 201 && r.text.includes('INVITE KEY CREATED'), r.text)
r = await call(`/r/${vid}/manage?key=${guestKey}`, form({ action: 'close' })); ok('invite key cannot manage', r.status === 403)
r = await call(`/r/${vid}/manage?key=${vowner}`, form({ action: 'visibility', visibility: 'unlisted' }))
r = await call(`/r/${vid}/messages`); ok('owner can open a room up (private -> unlisted)', r.status === 200)

// public listing + expiry + extend + delete
r = await call('/new', form({ goal: 'public chat about ducks', visibility: 'public', expires: '1h' })); const pubId = idOf(r.text); const pubOwner = grab(r.text, 'Owner key')
await db.query(`update rooms set expires_at = now() - interval '1 minute' where id=$1`, [pubId])
r = await call(`/r/${pubId}/messages`); ok('expired room -> 410', r.status === 410, r.text)
r = await call('/new', form({ goal: 'x', expires: 'soon' })); ok('bad expiry rejected', r.status === 400, r.text)
r = await call('/new', form({ goal: 'x', visibility: 'secret' })); ok('bad visibility rejected', r.status === 400, r.text)
r = await call(`/new?goal=${encodeURIComponent('via GET')}&expires=2h`); ok('GET /new fallback works', r.status === 201 && r.text.includes('via GET'))
r = await call(`/r/${id}/manage?key=${owner}`, form({ action: 'extend', expires: '30d' })); ok('extend', r.text.includes('expires now'), r.text)
r = await call(`/r/${id}/manage?key=${owner}`, form({ action: 'delete' })); ok('delete', r.text.trim() === 'deleted')
r = await call(`/r/${id}/messages`); ok('deleted room -> 404', r.status === 404)
r = await call('/start'); ok('/start serves the bootstrap prompt', r.text.includes('support chat') && r.text.includes('/help'))
r = await call('/health'); ok('health', r.text.trim() === 'ok')

// identities, humans, warnings
r = await call('/new', form({ goal: 'identity test', expires: '1h', as: 'chris-agent' })); const iid = idOf(r.text)
ok('creation reply carries the warning', r.text.includes('prompt injection'))
r = await call(`/r/${iid}/messages?as=codex-bot&client=Codex&model=Luna&human=Dana`, { method: 'POST', body: 'hi from codex' })
ok('agent posts with identity', r.text.trim() === 'posted #1', r.text)
r = await call(`/r/${iid}/messages?as=Priya&kind=human`, { method: 'POST', body: 'human here' })
ok('human posts from browser', r.text.trim() === 'posted #2', r.text)
r = await call(`/r/${iid}/messages?after=0&as=codex-bot`)
ok('transcript shows client+model and human label', r.text.includes('[codex-bot (Codex, Luna)') && r.text.includes('[Priya (human)'), r.text)
r = await call(`/r/${iid}`)
ok('text view lists who is in the room', r.text.includes('WHO IS IN THE ROOM') && r.text.includes('codex-bot (Codex, Luna) for Dana') && r.text.includes('Priya (human)'), r.text)
ok('text view carries the warning', r.text.includes('prompt injection'))
r = await call(`/r/${iid}`, { headers: { accept: 'text/html' } })
ok('html embeds participants for the live view', r.text.includes('"client":"Codex"') && r.text.includes('"human":"Dana"'))
r = await call(`/r/${iid}/join?kind=human&as=Sam`, { method: 'POST' })
ok('human can register without posting', r.text.includes('joined as Sam (human)'), r.text)
r = await call(`/r/${iid}/messages?after=0&format=json`)
ok('json includes people', JSON.parse(r.text).people.some((p) => p.name === 'Sam' && p.kind === 'human'))
r = await call('/', { headers: { accept: 'text/html' } }); ok('landing page explains the product', r.text.includes('Paste one prompt'))
r = await call('/start'); ok('bootstrap prompt carries the warning', r.text.includes('prompt injection'))

// support desk: service-key room creation, json meta, tickets
r = await call('/v1/support-rooms', { method: 'POST', body: '{}', headers: { 'content-type': 'application/json' } })
ok('support-rooms refuses without the service key', r.status === 401 || r.status === 503, r.text)
if (process.env.ROOM_SERVICE_KEY) {
  r = await call('/v1/support-rooms', { method: 'POST', headers: { authorization: `Bearer ${process.env.ROOM_SERVICE_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ request_id: 'req_test', endpoint: 'POST /v1/invoices', error: 'RangeError: x', request: { body: { a: 1 } }, api_sha: 'abc1234' }) })
  const j = JSON.parse(r.text); ok('service key opens a room with a public url', r.status === 201 && /\/r\/[0-9a-f]{24}$/.test(j.room_url), r.text)
  r = await call(`/r/${j.room_id}/messages?after=0&format=json`)
  const jm = JSON.parse(r.text); ok('room starts with the incident + an open ticket', jm.messages[0].meta.type === 'incident' && jm.ticket.status === 'open', r.text)
  r = await call(`/r/${j.room_id}/messages?as=bot`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: 'hi', meta: { type: 'x' } }) })
  r = await call(`/r/${j.room_id}/messages?after=1&format=json`); ok('json post keeps meta', JSON.parse(r.text).messages[0].meta.type === 'x', r.text)
}
r = await call('/help', form({ issue: 'invoices 500' })); ok('/help opens a room and returns the join prompt', r.status === 200 && r.text.includes('live support chat'), r.text)
r = await call('/admin', { headers: { accept: 'text/html' } }); ok('admin lists tickets', r.text.includes('invoices 500'))
await db.end()
console.log(failed ? `\n${failed} FAILED` : '\nall passed'); process.exit(failed ? 1 : 0)
