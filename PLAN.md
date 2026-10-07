# MeetProxy — "Build an Agent" hackathon, Wed 2026-10-07

**Pitch:** support for agents. Your customer's agent pastes one prompt (or just follows the link in a 500
error body) and talks to our support agent, which has our codebase, fixes the bug live, ships it to prod, and
tells their agent to retry. No MCP, no SDK, no account: plain curl.

**Workflow we never want to do again:** an API 500 becomes a support ticket, a "please send the request id"
email, an escalation to engineering, and a fix next week. Here: two agents, a few minutes, one live page.

**Demo:** CorgiPay (invoicing SaaS, github.com/Metroxe/corgipay, https://corgipay.boilerroom.tech) has a planted
bug: line items with cents (58.50) 500. Biscuit Bakery's billing agent (Claude Code / ChatGPT, demo-customer/PROMPT.md)
invoices Corgi Cafe from the morning delivery log, hits the 500, joins the room from the error body; CorgiPay
Support (Agent37) reproduces, fixes, pushes, prod redeploys, the customer's agent retries: 201. The CorgiPay
dashboard shows the invoice pop in.

## Hard requirements (from the Luma page)
- Agent37 Cloud APIs: **mandatory** -> the support agent is a Hermes instance (j5atb8yky2); every turn is `POST {instance}.agent37.app/v1/responses` with a kept `session_id` per room; setup over the Hosting API `exec` endpoint.
- One sponsor from InstaCloud / Monid / OpenAI / Supabase -> **Supabase** as the room/ticket store (DATABASE_URL takes a Supabase pooler URL, TLS auto). OpenAI via Agent37's router (`AGENT37_MODEL`) as a bonus if a model is reliable.
- Submit by **4:40 PM** (remote, Google Form): team, workflow description, demo video link, sponsors, repo link, up to 5 files. Repo must be public, video link must open without permissions.

## Architecture (one domain: corgipay.boilerroom.tech, VM `meetproxy`)
```
customer's agent --POST /v1/invoices--> CorgiPay (:8080, Metroxe/corgipay, auto-deploys main)
      |                                   | on 500: POST /support/v1/support-rooms (service key) -> room_url in the error body
      | curl read/post                    v
      +------------------------> room server (:8791 under /support; this repo) <-- browser: live room + status rail
                                          ^
                    support-worker.mjs ---+--> Agent37 Hermes (/home/node/corgipay: pull, test, fix, push)
```
Status rail: Bug reported -> Agent37 investigating -> Patch committed <sha> -> Deployed to prod (/version) -> Customer retried: 200 OK.

## Checklist (times PT; build freeze 3:45, video 3:45-4:30, submit by 4:40)

### 0. Setup — 2:35-2:50
- [ ] Christopher: sign up at agent37.com and app.monid.ai (Google sign-in is fine). Claude can't create accounts.
- [ ] Claude: mint Agent37 key (dashboard/cloud/api-keys) → 1Password + `.env`
- [ ] Claude: mint Monid key (app.monid.ai/access/api-keys), check wallet balance → 1Password + `.env`
- [ ] Create one Hermes instance with a budget; smoke-test one `/v1/responses` turn; note latency
- [ ] Repo scaffold: fork agent-room into this folder, rebrand MeetProxy, local Postgres via docker

### 1. Core loop — 2:50-3:15
- [ ] `bridge.mjs`: create room, two private briefs, alternate turns via Agent37, AGREED detection, 8-turn cap
- [ ] Monid step: find a working places endpoint, run it, post top 5 venues as a card; agents must pick from it
- [ ] Final plan card + one Approve button per human
- [ ] One full end-to-end run with real keys

### 2. Polish — 3:15-3:40
- [ ] Landing: one sentence saying what it is, two brief boxes (You / Them), one "Send our agents" button
- [ ] Room view: two-voice chat, Agent37 instance badge per agent, Monid venue card, plan card
- [ ] Three full runs, keep the best seed for the video
- [ ] README (what, how, sponsors, run steps) + push to a public GitHub repo

### 3. Freeze — 3:40-3:45
- [ ] Demo script (below) rehearsed once, cached seed ready, browser tabs staged

### 4. Video — 3:45-4:30
- [ ] 60-90 s: problem (the group text) → two briefs → agents talk live → Monid venues → AGREED → approve
- [ ] Upload unlisted (YouTube or Loom), confirm it opens logged-out

### 5. Submit — 4:30-4:40
- [ ] Google Form: team, workflow, video link, sponsors (Agent37 + Monid [+ OpenAI]), repo link

## Scope cuts, decided in advance
- Agent37 turns slower than ~30 s → cap at 6 turns and speed the video up.
- Second Agent37 instance needs a top-up → run both agents as two sessions on one instance.
- Monid places endpoint slow or broken → pick any working Monid endpoint for venue data; last resort Hermes's built-in search, note it.
- No public deploy; the room runs locally for the video. Public tunnel only if time is left.
- No auth, no real calendar integration: briefs are typed text.

## Demo script (draft)
1. "Making one dinner plan takes 14 texts." Show a fake group text.
2. Type two briefs: Chris (free Thu after 7, Mission, vegetarian, <$40) and Sam (free Thu or Fri, SoMa, hates loud places).
3. Click "Send our agents". Two Agent37 agents trade availability without revealing full calendars.
4. Monid card lands: five real restaurants between Mission and SoMa.
5. Agents settle: "AGREED: Thu 7:30, <restaurant>". Both humans click Approve.
6. Close: "Your agent meets theirs. You just show up."
