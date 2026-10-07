// setup-support-agent: make sure the Agent37 support instance has the CorgiPay repo and can test it. Idempotent.
// Uses the Agent37 Hosting API exec endpoint: POST https://api.agent37.com/v1/instances/{id}/exec {command, user?}.
//   node setup-support-agent.mjs
// Env: AGENT37_API_KEY, AGENT37_INSTANCE, CORGIPAY_REPO_URL (default https://github.com/Metroxe/corgipay.git),
//      CORGIPAY_REPO_PATH (default /home/node/corgipay). Reads .env if present.
import { readFileSync, existsSync } from 'node:fs'

const envFile = new URL('./.env', import.meta.url)
if (existsSync(envFile)) for (const line of readFileSync(envFile, 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
  if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}
const KEY = process.env.AGENT37_API_KEY, ID = process.env.AGENT37_INSTANCE
if (!KEY || !ID) { console.error('Set AGENT37_API_KEY and AGENT37_INSTANCE'); process.exit(1) }
const REPO_URL = process.env.CORGIPAY_REPO_URL ?? 'https://github.com/Metroxe/corgipay.git'
const REPO = process.env.CORGIPAY_REPO_PATH ?? '/home/node/corgipay'

async function exec(command, user = 'node') {
  const r = await fetch(`https://api.agent37.com/v1/instances/${ID}/exec`, {
    method: 'POST', headers: { authorization: `Bearer ${KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ command, user }), signal: AbortSignal.timeout(180_000),
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(`exec HTTP ${r.status}: ${JSON.stringify(j).slice(0, 300)}`)
  return j // { exit_code, stdout, stderr }
}

const step = async (label, cmd) => {
  const out = await exec(cmd)
  console.log(`${out.exit_code === 0 ? 'ok  ' : 'FAIL'} ${label}${out.stdout?.trim() ? `\n     ${out.stdout.trim().split('\n').slice(-6).join('\n     ')}` : ''}${out.exit_code !== 0 && out.stderr ? `\n     ${out.stderr.trim().split('\n').slice(-4).join('\n     ')}` : ''}`)
  return out
}

await step('repo present (clone if missing)', `test -d ${REPO}/.git && echo "already cloned" || git clone ${REPO_URL} ${REPO}`)
await step('git pull', `cd ${REPO} && git checkout -q main && git pull -q --ff-only && git log --oneline -1`)
await step('git identity', `cd ${REPO} && (git config user.name >/dev/null || git config user.name "CorgiPay Support (Agent37)") && git config user.name`)
await step('push access (dry run)', `cd ${REPO} && git push --dry-run origin main 2>&1 | tail -1`)
await step('node + npm', 'node -v && npm -v')
await step('npm test (expected to fail while the planted bug exists)', `cd ${REPO} && npm test 2>&1 | grep -E "^ℹ (pass|fail)" || true`)
console.log(`\nSupport agent ready: instance ${ID}, repo ${REPO}`)
