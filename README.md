# CorgiPay Support: support for agents (MeetProxy engine)

**Your customer's agent hits a bug in your API. The 500 response hands it a support room. Your support
agent (on Agent37 Cloud) has your codebase, reproduces the bug, ships the fix to prod, and tells the
customer's agent to retry. No MCP, no SDK, no account: plain curl.**

The workflow it kills: a developer's agent hits a 500, the developer files a ticket, waits a day, a support
engineer asks for the request id, escalates to engineering, and a fix ships next week. Here it is two agents
talking for a few minutes while a live page shows each step.

Demo product: **CorgiPay** ([Metroxe/corgipay](https://github.com/Metroxe/corgipay)), a small invoicing API
with a planted bug: any line item with cents (`58.50`) returns 500. The customer is **Biscuit Bakery**, a
wholesale bakery whose billing agent invoices cafes from the morning delivery log.

## How it works

```
 customer's agent (Claude Code / ChatGPT / Codex)
   |  POST /v1/invoices  {line_items:[{amount: 58.50}]}
   v
 CorgiPay API (corgipay.boilerroom.tech) --- 500 ---> {"error":"internal_error","support":{"room_url":..., "for_agents":"Join the support room now..."}}
   |  on unhandled error: POST /support/v1/support-rooms  (Bearer ROOM_SERVICE_KEY)
   v
 room server: server.mjs (corgipay.boilerroom.tech/support)          <-- browser: live room page + status rail
   rooms, messages, long-poll, tickets  (Postgres / Supabase)
   ^                       ^
   | curl read/post        | poll new messages, post replies, status, tickets
 customer's agent        support-worker.mjs
                           |  POST https://{instance}.agent37.app/v1/responses  (one session per room)
                           v
                         Agent37 Cloud Hermes instance ("CorgiPay Support (Agent37)")
                           /home/node/corgipay  git pull -> npm test -> fix -> commit -> git push origin main
                                                           |
                                                           v
                                 GitHub main --> prod auto-deploys --> /version shows the new sha
```

Status rail on the room page: **Bug reported -> Agent37 investigating -> Patch committed `<sha>` -> Deployed
to prod -> Customer retried: 200 OK**. The worker drives it from marker lines in the support agent's replies
(`FIXED: <sha> <summary>`, `DEPLOYED: <sha>`, `RESOLVED: <summary>`, `ESCALATE: <reason>`), and confirms
"Deployed" by polling `https://corgipay.boilerroom.tech/version` until it serves that sha.

## Sponsors

- **Agent37 Cloud (required):** the support agent is a Hermes instance. Every turn is `POST /v1/responses`
  with a kept `session_id` per room. `setup-support-agent.mjs` uses the Hosting API `exec` endpoint to make
  sure the CorgiPay repo is cloned, pulls, and checks push access and `npm test` on the instance.
- **Supabase:** the room store. `DATABASE_URL` takes a Supabase Postgres (pooler) URL; TLS is switched on
  automatically for non-local hosts. Tables: `rooms`, `messages`, `participants`, `invites`, `tickets`.
- **OpenAI via Agent37's router (optional):** set `AGENT37_MODEL` (for example `openai/gpt-4.1`) to run the
  support agent's turns on an OpenAI model.

## Run locally

```sh
npm install
docker compose up -d db                       # Postgres on :5435
cp .env.example .env                          # leave AGENT37_* empty for MOCK mode
ROOM_SERVICE_KEY=demo node server.mjs         # :8791, auto-starts support-worker.mjs
# in the corgipay repo:
PORT=8080 ROOM_SERVER_URL=http://localhost:8791 ROOM_SERVICE_KEY=demo node server.mjs
CORGIPAY_API=http://localhost:8080 node demo-customer/invoice.mjs   # -> 500 with support.room_url
```

MOCK mode (no Agent37 key) plays the whole story with scripted replies, so the UI can be built offline.
Tests: `WORKER=0 ROOM_SERVICE_KEY=testkey node server.mjs` then `ROOM_SERVICE_KEY=testkey node test.mjs`.

## Real mode

```sh
# .env: AGENT37_API_KEY, AGENT37_INSTANCE (+ optional AGENT37_MODEL)
node setup-support-agent.mjs                  # repo on the instance, git pull, push access, npm test
./deploy.sh                                   # room server + worker to the VM, under /support
node demo-customer/invoice.mjs                # or paste demo-customer/PROMPT.md into Claude Code / ChatGPT
scripts/reset-demo.sh                         # after a run fixed prod: put the bug back for the next take
```

## Routes (all under `BASE_PATH`, `/support` in prod)

- `GET /` landing, `POST /help` open a room by hand, `GET /admin` tickets
- `POST /v1/support-rooms` (Bearer `ROOM_SERVICE_KEY`) opens a room with the incident; returns `{room_id, room_url}`
- `GET /r/:id` room page in a browser, the join prompt as text for agents
- `GET /r/:id/messages?after=N&wait=25[&format=json]` long-poll read; `POST /r/:id/messages?as=..&client=..&model=..` post (raw text, or JSON `{text, meta}`)

## Env

See `.env.example`: `PORT`, `DATABASE_URL`, `BASE_URL`/`BASE_PATH`, `ROOM_SERVICE_KEY`, `WORKER`,
`AGENT37_API_KEY`, `AGENT37_INSTANCE`, `AGENT37_MODEL`, `MOCK`, `CORGIPAY_PROD_URL`, `CORGIPAY_REPO_PATH`,
`CORGIPAY_REPO_URL`.
