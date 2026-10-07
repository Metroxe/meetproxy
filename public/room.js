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
  const short = (n) => String(n || '').replace(/ \(Agent37\)$/, '')
  document.getElementById('who').innerHTML = '<div class="nmline">' + (cust ? E(cust.name) + ' <span class="sw">⇄</span> ' : '') + E(short(D.support)) + (rel ? ' <span class="sw">+</span> ' + E(short(D.release)) : '') + '</div><div class="spons2">' +
    '<span class="powered"><img src="' + LOGO + '" alt="">Powered by Agent37</span>' +
    '<span class="powered supa"><svg viewBox="0 0 109 113" width="14" height="14" aria-hidden="true"><path d="M63.7 110.3c-2.9 3.6-8.7 1.6-8.8-3l-1-67.3h45.4c8.2 0 12.8 9.5 7.7 15.9z" fill="#249361"/><path d="M45.3 2.1c2.9-3.6 8.7-1.6 8.8 3l.4 67.3H9.8c-8.2 0-12.8-9.5-7.7-15.9z" fill="#3ECF8E"/></svg>Data on Supabase</span>' +
    '<span class="powered"><span style="font-weight:700">&#9711;</span> Postmortems by OpenAI</span></div>'
  const t = ticket || { status: 'open', summary: '' }
  document.getElementById('banner').innerHTML = t.status === 'open' ? '' : '<div class="banner ' + E(t.status) + '"><span class="tag">Chat ' + E(t.status) + '</span>' + (t.status === 'resolved' ? '✓ ' + E(t.summary) : 'Escalated to a human: ' + E(t.summary)) + '</div>'
}

const ACT = { investigating: ['LOOK', 'Investigating'], logs: ['LOGS', 'Found it in the logs'], reproduced: ['TEST', 'Bug reproduced in a sandbox'], verified: ['DEV', 'Fix works on the dev server'], patch: ['PR', 'Patch ready'], review: ['REVIEW', 'Release approved'], deployed: ['PROD', 'Deployed to production'], retried: ['200', 'Customer retried: 200 OK'] }
const LIVE = { logs: ['LOGS', 'Searching the logs'], reproduced: ['TEST', 'Testing in a sandbox'], verified: ['DEV', 'Fixing it on the dev server'], review: ['REVIEW', 'Release review'], deployed: ['PROD', 'Deploying to production'], retried: ['RETRY', 'Retrying the request'] }
const tile = (tag) => '<span class="tile t-' + tag.toLowerCase() + '">' + ({ LOGS: '<i class="mag"></i>', TEST: '<i class="flask"></i><i class="bub"></i><i class="bub"></i>', DEV: '<i class="term">&gt;_</i>', REVIEW: '<i class="chk"></i>', PROD: '<i class="rkt">🚀</i>', RETRY: '<i class="spin"></i>', '200': '✓', PR: '⎇', LOOK: '<i class="mag"></i>' })[tag] + '</span>'
const ICON = { investigating: '🔎', logs: '▤', reproduced: '✗', verified: '✓', patch: '⎇', review: '⎇', deployed: '🚀', retried: '✓' }
function sysCard(m, pop) {
  const x = m.meta || {}; const P = pop ? ' pop' : ''
  if (x.type === 'incident') return '<div class="card incident' + P + '"><div class="kick"><span class="pulse"></span>' + E(D.api) + ' · HTTP 500</div><h3>' + E(x.endpoint) + ' failed</h3>' + (x.request ? '<details class="req"><summary>Request <code>' + E(x.request_id) + '</code></summary>' + md('```\n' + JSON.stringify(x.request, null, 2) + '\n```') + '</details>' : '<code>' + E(x.request_id) + '</code>') + '</div>'
  if (x.type === 'logs') return '<div class="card logs' + P + '"><div class="lrow">' + tile('LOGS') + '<div class="lt"><b>Every request is in Grafana</b><code>' + E(x.request_id) + '</code></div><a class="go" href="' + E(x.url) + '" target="_blank" rel="noopener">Open in Grafana ↗</a></div></div>'
  if (x.type === 'status') { const a = ACT[x.stage] || ['•', m.body]; return '<div class="act s-' + E(x.stage) + P + '" title="' + E(m.body) + '">' + tile(a[0]) + '<span class="tg">' + E(a[0]) + '</span><span class="al">' + E(a[1]) + '</span>' + (/^https?:/.test(x.detail || '') ? '<a href="' + E(x.detail) + '" target="_blank" rel="noopener">Grafana ↗</a>' : '') + '<span class="tm">' + tm(m.created_at) + '</span></div>' }
  if (x.type === 'ticket') return '<div class="card ticket ' + E(x.status) + P + '"><div class="kick">' + (x.status === 'resolved' ? '✓ Chat resolved' : '⚑ Escalated to a human') + '</div><h3>' + E(x.summary) + '</h3></div>'
  if (x.type === 'ai') return '<div class="card ai' + P + '"><div class="kick">◆ ' + (x.kind === 'postmortem' ? 'Postmortem' : 'Incident summary') + ' · OpenAI ' + E(String(x.model || '').replace(/^openai\//, '')) + '</div>' + (x.kind === 'postmortem' ? '<div class="pm">' + E(m.body) + '</div>' : '<h3 title="' + E(x.why || '') + '"><span class="sev">' + E(x.severity) + '</span>' + E(x.title) + '</h3>') + '</div>'
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
    if (first) h += '<div class="nm">' + E(String(m.sender).replace(/ \(Agent37\)$/, '')) + '<span class="mdl">' + (them ? E('Agent37 · ' + (p.model && !/default|^mock$/.test(p.model) ? p.model : 'Agent37 default')) : E([p.client, p.model].filter(Boolean).join(' · ') || 'agent')) + '</span></div>'
    if (them && lastOfRun) h += '<span class="av2">' + logo() + '</span>'
    h += '<div class="b' + (lastOfRun ? ' tail' : '') + (it.body.length > 240 ? ' long" onclick="this.classList.toggle(\'open\')' : '') + '">' + md(it.body) + '</div></div>'
    prev = m
  }
  const cur = rail()
  const tk = ticket || {}
  const done = ['resolved', 'escalated'].includes(tk.status)
  const lastM = items.length ? items[items.length - 1].m : null
  if (!done && msgs.length) {
    const step = (STEPS[cur] || [])[0]
    const supTurn = typing || !lastM || !isS(lastM) || step === 'deployed'
    if (supTurn && step !== 'retried') {
      const lv = LIVE[step] || ['LOOK', 'Looking into it']; const nmS = typing || D.support
      const sameRun = prev && prev.sender === nmS
      h += '<div class="row them live first"><div class="nm">' + E(String(nmS).replace(/ \(Agent37\)$/, '')) + '<span class="mdl">Agent37</span></div><span class="av2">' + logo() + '</span><div class="b tail lv t2-' + lv[0].toLowerCase() + '">' + tile(lv[0]) + '<span class="lvt"><span class="tg">' + lv[0] + '</span>' + lv[1] + '</span><span class="dots"><i></i><i></i><i></i></span><span class="bar"></span></div></div>'
    } else {
      const cust = Object.values(people).find((p) => !isS({ sender: p.name }) && p.name !== D.api && !/ Logs$/.test(p.name) && p.kind === 'agent')
      h += '<div class="row me live first"><div class="nm">' + E(cust ? cust.name : 'Customer agent') + (step === 'retried' ? '<span class="mdl">retrying the request</span>' : '<span class="mdl">writing back</span>') + '</div><div class="b tail typ"><span class="dots"><i></i><i></i><i></i></span></div></div>'
    }
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
