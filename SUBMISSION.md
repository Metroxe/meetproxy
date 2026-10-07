# Google Form answers (draft, paste-ready; no em dashes on purpose)

**Project name:** MeetProxy: live support for your customers' AI agents (demo: CorgiPay)

**Team members:** Christopher Powroznik

**Workflow you never want to do again:**
Filing a support ticket, waiting days, and babysitting a broken integration. More and more API traffic comes from AI agents, and when an agent hits a bug it just fails: a human has to open a ticket, copy logs, and wait for an engineer to dig through the backend.

MeetProxy turns the error itself into the fix. CorgiPay (a demo invoicing API) returns a generic 500 with a request id and a support room link. The customer's agent (Claude Code, ChatGPT, Codex, anything that can make an HTTP request) joins the room by itself: no MCP, no SDK, no install.

On the other side, two Agent37 Cloud agents work the incident:
1. CorgiPay Support (Agent37) looks up the request id in our Grafana / Loki logs and finds the real stack trace the customer never saw.
2. It reproduces the failure in its own sandbox: a full clone of the repo on its Agent37 instance, with a dev server it starts itself, replaying the customer's exact request.
3. It patches the code, re-runs the request against the dev server until it returns 201, runs the tests, and pushes a fix branch.
4. CorgiPay Release (Agent37), a second agent in its own session, reviews the diff, re-runs the tests, merges to main, and waits until production reports the new commit.
5. The customer's agent retries and the invoice appears on the dashboard. Both humans watched the whole thing live in an iMessage-style room.

Demo story: Biscuit Bakery's billing agent invoices Corgi Cafe for this morning's delivery (18 croissants x $3.25 = $58.50). Amounts with cents crash CorgiPay. A couple of minutes later the bug is fixed in production by agents, and nobody filed a ticket.

**Time saved:** a broken-integration support ticket normally takes a human 1 to 3 days (open ticket, copy logs, wait for triage, wait for an engineer, wait for a release, retry). Here: about 2.5 minutes from the 500 to a successful retry, with zero humans in the loop on either side.

**Who buys it:** any API or SaaS company whose customers increasingly integrate through AI agents. It sells per resolved incident, and it plugs in with one change: return the support link in your 5xx responses.

**Sponsor integrations:**
- Agent37 Cloud (required): both support agents run on a Hermes instance created with the Agent37 Hosting API. We stage the repo, a write-scoped deploy key and read-only Grafana access over the exec API; each agent is its own session driven through `POST /v1/responses`; the instance is the sandbox where the fix is reproduced and verified before it ships.
- Supabase: the support desk's database (rooms, messages, incidents, tickets) runs on Supabase Postgres.
- OpenAI: after each incident, an OpenAI model (through Agent37's model router) writes the customer-facing postmortem shown in the room.

**Links:**
- Live demo: https://corgipay.boilerroom.tech (CorgiPay dashboard), https://corgipay.boilerroom.tech/support (support rooms), https://logs.boilerroom.tech (Grafana)
- Repo (support desk + agent worker): https://github.com/Metroxe/meetproxy
- Repo (CorgiPay, the API the agents fix live): https://github.com/Metroxe/corgipay
- Demo video: <paste unlisted link>

# Video timeline (about 1:45, Screen Studio)

Sponsor rule: Agent37 is named out loud at least 3 times and its logo is on screen whenever an agent speaks; Supabase and OpenAI each get a spoken line and an on-screen badge.

| Time | On screen | Voiceover |
|---|---|---|
| 0:00-0:08 | Title card: "Your customers' agents hit bugs. Ours fix them in prod." + Agent37, Supabase, OpenAI logos | "Built on Agent37 Cloud, with Supabase and OpenAI." |
| 0:08-0:18 | CorgiPay dashboard (Biscuit Bakery) | "Biscuit Bakery's AI agent invoices every cafe after the morning delivery." |
| 0:18-0:32 | Claude Code: paste prompt, POST /v1/invoices, generic 500 | "It hits a bug. All it gets is 'something went wrong' and a request id." |
| 0:32-0:42 | Claude Code joins the room by itself; cut to the iMessage room | "No ticket, no MCP. The error hands the agent a support room." |
| 0:42-0:57 | Agent37 bubbles (logo avatar), "Logs · Grafana" card, click it: the RangeError in Loki | "Our support engineer is an Agent37 agent. It pulls our real logs for that request id." |
| 0:57-1:12 | Room: sandbox dev server, reproduced, fix verified (sped up, label "4x") | "In its Agent37 sandbox it clones the repo, reproduces the bug on a dev server, and proves the fix." |
| 1:12-1:22 | CorgiPay Release (Agent37) reviews, merges; status rail hits "Deployed"; GitHub commit by the agent | "A second Agent37 agent reviews and ships it to production." |
| 1:22-1:32 | Claude Code retries: 201. Invoice slides into the dashboard | "The customer's agent retries. Done. A ticket that takes days took two and a half minutes." |
| 1:32-1:40 | OpenAI postmortem card; Supabase badge on the room / admin page | "OpenAI writes the postmortem, and every incident is stored in Supabase." |
| 1:40-1:45 | End card: repo links + "Agent37 · Supabase · OpenAI" | "MeetProxy. One error, one fix, in production." |

Before each take: `scripts/reset-demo.sh` (puts the bug back), then hard-refresh the dashboard.
