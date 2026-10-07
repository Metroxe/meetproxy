# Google Form answers (draft, paste-ready; no em dashes on purpose)

**Project name:** MeetProxy: support for your customers' agents (demo: CorgiPay)

**Team members:** Christopher Powroznik

**Workflow you never want to do again:**
Filing a support ticket, waiting days, and babysitting a broken integration. More and more API traffic comes from AI agents, but when an agent hits a bug it just fails and a human has to open a ticket, copy logs, and wait for an engineer.

MeetProxy turns the error itself into the fix. When CorgiPay (a demo invoicing API) throws a 500, the error response hands the calling agent a support room link. The customer's agent (Claude, ChatGPT, Codex, anything that can make an HTTP request) joins by itself: no MCP, no SDK, no install. On the other side is CorgiPay's support engineer, an Agent37 Cloud agent with the real codebase checked out. It reproduces the bug, patches the code, runs the tests, pushes to main, waits for production to pick up the new commit, and tells the customer's agent to retry. The retry succeeds and the invoice appears on the dashboard. Nobody filed a ticket, and both humans can watch the whole conversation live in the browser.

Demo story: Biscuit Bakery's billing agent invoices Corgi Cafe for this morning's delivery (18 croissants x $3.25 = $58.50). Amounts with cents crash CorgiPay. About two minutes later the bug is fixed in production and the invoice shows up on the dashboard.

**Sponsor integrations:**
- Agent37 Cloud (required): the support engineer is a Hermes instance created with the Hosting API. We stage the repo and a write-scoped deploy key over the exec API, and every support turn is a `POST /v1/responses` on the instance URL, with one `session_id` per support room so the agent keeps context.
- OpenAI: the Agent37 agent thinks with an OpenAI model (`openai/gpt-5`) through Agent37's model router.

**Links:**
- Live demo: https://corgipay.boilerroom.tech (dashboard) and https://corgipay.boilerroom.tech/support (support rooms)
- Repo (support desk + worker): https://github.com/Metroxe/meetproxy  <!-- create before submitting -->
- Repo (CorgiPay, the API the agent fixes live): https://github.com/Metroxe/corgipay
- Demo video: <paste unlisted link>

# Video script (60 to 90 s)
1. (5 s) Title: "Your customers' agents hit bugs. Ours fix them live."
2. (10 s) Biscuit Bakery's billing agent in Claude Code gets today's delivery log and starts invoicing through CorgiPay.
3. (10 s) The $58.50 line returns 500. Zoom on the error body: `support.room_url`. The agent opens it on its own.
4. (30 s) Split screen: the support room live (customer agent left, CorgiPay Support (Agent37) right) and the status rail ticking: bug reported, investigating, patch committed, deployed.
5. (10 s) GitHub commit by "CorgiPay Support (Agent37)"; /version flips to the new sha.
6. (10 s) Customer agent retries: 201. The invoice slides into the CorgiPay dashboard.
7. (5 s) Close: "No ticket. No MCP. One error, one fix, in production."
