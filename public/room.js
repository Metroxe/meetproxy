// Room page client: iMessage-style conversation + status rail. Expects a global D (room data) set by the server.
const E = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const st = document.getElementById('stream')
let last = 0, msgs = [], ticket = D.ticket, typing = D.typing || null, shownN = -1
const people = {}; for (const p of D.people) people[p.name] = p
const tm = (d) => new Date(d).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
const isS = (m) => m.sender === D.support || m.sender === D.release
const LOGO = D.base + '/brand/agent37-logo.png'
const logo = () => '<span class="logo37"><img src="' + LOGO + '" alt="Agent37"></span>'
const ini = (n) => '<span class="ini">' + E((n || '?')[0].toUpperCase()) + '</span>'
const link = (u) => '<a href="' + u + '" target="_blank" rel="noopener">' + (u.includes('/explore') ? 'Open in Grafana' : u) + '</a>'

function md(t) {
  const parts = String(t).split('```')
  return parts.map((p, i) => {
    if (i % 2) {
      const nl = p.indexOf('\n'); const head = nl >= 0 ? p.slice(0, nl).trim() : ''; const code = nl >= 0 ? p.slice(nl + 1) : p
      const fn = /[\/.:]/.test(head) ? '<span class="fn">' + E(head) + '</span>' : ''
      return '<pre>' + fn + E(code.replace(/\n$/, '')) + '</pre>'
    }
    return p.trim() ? p.trim().split(/\n{2,}/).map((x) => '<p>' + E(x).replace(/`([^`\n]+)`/g, '<code>$1</code>').replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>').replace(/(https?:\/\/[^\s<]+)/g, link) + '</p>').join('') : ''
  }).join('')
}
const MARK = /^\s*(LOGS|REPRODUCED|VERIFIED|PATCH|MERGED|REJECTED|FIXED|DEPLOYED|RESOLVED|ESCALATE|COMMITTED):\s*(.+)$/gim

function stages() {
  const S = {}; const set = (k, m, d) => { if (!S[k]) S[k] = { at: m.created_at, d: d || '' } }
  const MK = { LOGS: 'logs', REPRODUCED: 'reproduced', VERIFIED: 'verified', MERGED: 'review' }
  for (const m of msgs) {
    const x = m.meta || {}
    if (x.type === 'incident') set('reported', m, x.request_id)
    if (x.type === 'status') set(x.stage, m, x.detail)
    if (isS(m) && !['status', 'ai', 'ticket'].includes(x.type)) for (const mm of m.body.matchAll(MARK)) {
      const t = mm[1].toUpperCase(); const sh = (mm[2].match(/\b[0-9a-f]{7,40}\b/) || [])[0]
      if (MK[t]) set(MK[t], m, t === 'MERGED' && sh ? sh.slice(0, 7) : (mm[2].match(/https?:\/\/\S+/) || [''])[0])
      if (t === 'DEPLOYED') set('review', m, sh ? sh.slice(0, 7) : '')
    }
  }
  if (!S.reported && msgs.length) S.reported = { at: msgs[0].created_at, d: '' }
  return S
}
const STEPS = [['reported', 'Incident opened'], ['logs', 'Logs found (Grafana)'], ['reproduced', 'Reproduced in sandbox'], ['verified', 'Fix verified on dev server'], ['review', 'Release review'], ['deployed', 'Deployed to prod'], ['retried', 'Customer retried (200)']]
function rail() {
  const S = stages(); let cur = STEPS.findIndex((s) => !S[s[0]]); if (cur < 0) cur = STEPS.length
  document.getElementById('rail').innerHTML = STEPS.map(([k, l], i) => {
    const d = S[k] && S[k].d; const dd = !d ? '' : /^https?:/.test(d) ? ' <a href="' + E(d) + '" target="_blank" rel="noopener">Grafana ↗</a>' : ' <code>' + E(d) + '</code>'
    return '<li class="' + (S[k] ? 'done' : i === cur ? 'now' : '') + '"><span class="b">' + (S[k] ? '✓' : i + 1) + '</span><span class="l">' + l + dd + '</span><span class="t">' + (S[k] ? tm(S[k].at) : i === cur ? 'in progress…' : '') + '</span></li>'
  }).join('')
  return cur
}
function header() {
  const cust = Object.values(people).find((p) => !isS({ sender: p.name }) && p.name !== D.api && !/ Logs$/.test(p.name) && p.kind === 'agent')
  const rel = msgs.some((m) => m.sender === D.release)
  document.getElementById('avs').innerHTML = (cust ? ini(cust.name) : '') + logo() + (rel ? logo() : '')
  document.getElementById('who').innerHTML = (cust ? E(cust.name) + ' <span style="color:var(--sub);font-weight:500">' + E([cust.client, cust.model].filter(Boolean).join(' · ')) + '</span> ⇄ ' : '') + E(D.support) + (rel ? ' + ' + E(D.release) : '') +
    ' <span class="powered"><img src="' + LOGO + '" alt="">Powered by Agent37</span>' +
    ' <span class="powered supa"><svg viewBox="0 0 109 113" width="14" height="14" aria-hidden="true"><path d="M63.7 110.3c-2.9 3.6-8.7 1.6-8.8-3l-1-67.3h45.4c8.2 0 12.8 9.5 7.7 15.9z" fill="#249361"/><path d="M45.3 2.1c2.9-3.6 8.7-1.6 8.8 3l.4 67.3H9.8c-8.2 0-12.8-9.5-7.7-15.9z" fill="#3ECF8E"/></svg>Data on Supabase</span>' +
    ' <span class="powered"><span style="font-weight:700">&#9711;</span> Postmortems by OpenAI</span>'
  const t = ticket || { status: 'open', summary: '' }
  document.getElementById('banner').innerHTML = t.status === 'open' ? '' : '<div class="banner ' + E(t.status) + '"><span class="tag">Chat ' + E(t.status) + '</span>' + (t.status === 'resolved' ? '✓ ' + E(t.summary) : 'Escalated to a human: ' + E(t.summary)) + '</div>'
}

const ICON = { investigating: '🔎', logs: '▤', reproduced: '✗', verified: '✓', patch: '⎇', review: '⎇', deployed: '🚀', retried: '✓' }
function sysCard(m, pop) {
  const x = m.meta || {}; const P = pop ? ' pop' : ''
  if (x.type === 'incident') return '<div class="card incident' + P + '"><div class="kick">● ' + E(D.api) + ' · HTTP 500 · ' + E(x.request_id) + '</div><h3>' + E(x.endpoint) + ': Something went wrong on our side</h3><div class="note" style="margin-top:2px">The customer\'s agent only saw a generic 500 and this support link. The real error is in our logs.</div>' + (x.request ? md('```request (sanitized)\n' + JSON.stringify(x.request, null, 2) + '\n```') : '') + '</div>'
  if (x.type === 'logs') return '<div class="card logs' + P + '"><div class="kick">▤ Logs · Grafana</div><h3>Every request is logged to Loki. Query for <code>' + E(x.request_id) + '</code></h3><div class="note" style="margin-top:0"><code>{app="corgipay"} |= "' + E(x.request_id) + '"</code></div><a class="go" href="' + E(x.url) + '" target="_blank" rel="noopener">Open in Grafana Explore ↗</a></div>'
  if (x.type === 'status') return '<div class="sysp k-' + E(x.stage) + P + '"><span class="ic">' + (ICON[x.stage] || '•') + '</span>' + E(m.body) + (/^https?:/.test(x.detail || '') ? ' · ' + link(E(x.detail)) : '') + '<span style="font-weight:500;opacity:.7">· ' + tm(m.created_at) + '</span></div>'
  if (x.type === 'ticket') return '<div class="card ticket ' + E(x.status) + P + '"><div class="kick">' + (x.status === 'resolved' ? '✓ Chat resolved' : '⚑ Escalated to a human') + '</div><h3>' + E(x.summary) + '</h3></div>'
  if (x.type === 'ai') return '<div class="card ai' + P + '"><div class="kick">◆ ' + (x.kind === 'postmortem' ? 'Postmortem' : 'Incident summary') + ' · OpenAI ' + E(String(x.model || '').replace(/^openai\//, '')) + '</div>' + (x.kind === 'postmortem' ? '<div class="pm">' + E(m.body) + '</div>' : '<h3><span class="sev">' + E(x.severity) + '</span>' + E(x.title) + '</h3>' + (x.why ? '<div class="note">' + E(x.why) + '</div>' : '')) + '</div>'
  if (m.sender_kind === 'human') return '<div class="sysp' + P + '"><b>' + E(m.sender) + '</b>: ' + E(m.body) + '</div>'
  return null
}

function render() {
  let h = '', prev = null, prevT = 0
  const items = []
  for (const m of msgs) {
    const sys = sysCard(m, m.n > shownN && shownN >= 0)
    if (sys !== null) { items.push({ sys, m }); continue }
    const body = m.body.replace(MARK, '').trim()
    if (!body) continue
    items.push({ m, body })
  }
  for (let i = 0; i < items.length; i++) {
    const it = items[i], m = it.m, t = new Date(m.created_at).getTime()
    if (!prevT || t - prevT > 5 * 60_000) h += '<div class="day"><b>Today</b> ' + tm(m.created_at) + '</div>'
    prevT = t
    if (it.sys) { h += it.sys; prev = null; continue }
    const nx = items[i + 1]
    const first = !prev || prev.sender !== m.sender
    const lastOfRun = !nx || nx.sys || nx.m.sender !== m.sender
    const them = isS(m), p = people[m.sender] || {}
    const pop = shownN >= 0 && m.n > shownN
    h += '<div class="row ' + (them ? 'them' : 'me') + (first ? ' first' : '') + (pop ? ' pop' : '') + '">'
    if (first) h += '<div class="nm">' + E(m.sender) + (them ? ' · ' + E('Agent37 Hermes · model: ' + (p.model && !/default|^mock$/.test(p.model) ? p.model : 'Agent37 default')) : ' · ' + E([p.client, p.model].filter(Boolean).join(' · ') || 'agent')) + '</div>'
    if (them && lastOfRun) h += '<span class="av2">' + logo() + '</span>'
    h += '<div class="b' + (lastOfRun ? ' tail' : '') + '">' + md(it.body) + '</div></div>'
    prev = m
  }
  const cur = rail()
  const tk = ticket || {}
  if (typing && tk.status !== 'resolved') {
    const sameRun = prev && prev.sender === typing
    h += '<div class="row them typing2' + (sameRun ? '' : ' first') + '">' + (sameRun ? '' : '<div class="nm">' + E(typing) + '</div>') + '<span class="av2">' + logo() + '</span><div class="b tail"><i></i><i></i><i></i></div></div>'
  }
  const atEnd = innerHeight + scrollY >= document.body.scrollHeight - 220
  st.innerHTML = h; header()
  shownN = msgs.length ? msgs[msgs.length - 1].n : 0
  if (atEnd && msgs.length > 1) scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
}
document.getElementById('paste').addEventListener('toggle', (e) => { e.target.dataset.touched = 1 })
function add(j) {
  for (const p of j.people || []) people[p.name] = p
  if (j.ticket) ticket = j.ticket
  let changed = false
  if ('typing' in j && j.typing !== typing) { typing = j.typing; changed = true }
  for (const m of j.messages || []) if (m.n > last) { msgs.push(m); last = m.n; changed = true; if (m.meta && m.meta.type === 'ticket') ticket = { status: m.meta.status, summary: m.meta.summary } }
  if (changed) render()
}
async function poll() { for (;;) { try { const r = await fetch(location.pathname + '/messages?format=json&wait=25&after=' + last); if (r.ok) add(await r.json()); else await new Promise((r) => setTimeout(r, 1500)) } catch (e) { await new Promise((r) => setTimeout(r, 1500)) } } }
async function pollTyping() { for (;;) { await new Promise((r) => setTimeout(r, 1500)); try { const r = await fetch(location.pathname + '/messages?format=json&after=' + last); if (r.ok) add(await r.json()) } catch (e) {} } }
add(D); if (!msgs.length) render(); poll(); pollTyping()
