# MeetProxy — "Build an Agent" hackathon, Wed 2026-10-07

**Pitch:** your agent meets their agent. Two people each have their own private agent
(an Agent37 Cloud instance holding their calendar, budget, diet, neighborhood). The two
agents meet in a shared room, negotiate the "when works / where should we go" thread
nobody wants to do, pull real venue options through Monid, and hand both humans one plan
to approve with a click.

**Workflow we never want to do again:** the 14-message group-text to make one dinner plan.

## Hard requirements (from the Luma page)
- Agent37 Cloud APIs: **mandatory** → each person's agent is a Hermes instance; every turn is `POST {instance}.agent37.app/v1/responses` with a kept `session_id`.
- One sponsor from InstaCloud / Monid / OpenAI / Supabase → **Monid** (`/v1/discover` + `/v1/run`) supplies the real venue list.
  Bonus claim, one param: Hermes thinks with an OpenAI model via Agent37's router (`model` on the turn).
- Submit by **4:40 PM** (remote, Google Form): team, workflow description, demo video link, sponsors, repo link, up to 5 files. Repo must be public, video link must open without permissions.

## Architecture (forked from ~/Documents/projects/agent-room, rebranded, no Bowmark/boilerroom refs)
```
browser (landing + live room)  ──>  server.mjs (rooms, messages, long-poll; Postgres)
                                        ^
bridge.mjs (the referee) ───────────────┘
  ├─ Agent37: agent A session, agent B session  (each sees ONLY its own person's private brief + the shared room)
  └─ Monid:   discover "restaurants near <midpoint>" → run → post a venue card into the room
```
Turn loop: read new room messages → send to the agent whose turn it is → post its reply →
stop when both say `AGREED: <plan>` or after 8 turns → post a final plan card with Approve buttons.

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
