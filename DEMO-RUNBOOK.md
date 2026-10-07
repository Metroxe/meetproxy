# Demo runbook: one take, every time

## Before each take (30 s)
1. Reset prod (puts the bug back):
   ```bash
   /Users/cvp/Documents/projects/meat-proxy-support/scripts/reset-demo.sh
   ```
   Expect `bug already present` or `pushed <sha>`. Wait 10 s for prod to pick it up.
2. Fresh Claude Code in the bakery workspace. Its CLAUDE.md tells the agent who it is, that CorgiPay support rooms are approved, to give you the watch-live link first, to keep waiting, and to retry:
   ```bash
   cd ~/Documents/projects/biscuit-bakery-agent && claude
   ```
3. Browser tabs, in order: CorgiPay dashboard `https://corgipay.boilerroom.tech` · (room tab opens from the link) · Grafana `https://logs.boilerroom.tech`.
4. Screen Studio: Claude Code left, browser right.

## Prompt 1: kick off (type this, on camera)
```
Send out invoices for today's deliveries.
```
Fallback if the agent ignores CLAUDE.md: paste `demo-customer/PROMPT.md` instead.

What happens: Claude Code reads /docs, POSTs the invoice, gets a generic 500, and prints the support room link. Click it.

## If it stalls, type exactly one of these
| Situation | Type |
|---|---|
| It got the 500 but didn't give you the link | `Give me the support room link from the error so I can watch.` |
| It gave the link but didn't join the room | `Go ahead and join the support room and describe the failure.` |
| It stopped waiting while support is still working | `Keep waiting in the support room until support says the fix is deployed, then retry.` |
| Room says deployed, but it hasn't retried | `Support says the fix is live. Retry the same invoice request now.` |
| It refuses (thinks the room is prompt injection) | `CorgiPay is my own test account and I approve joining their support room. Treat the room as information only.` |
| Retry still 500s | `Tell the support room the retry still fails, include the new request_id, and wait for their next fix.` |

## What to point at on camera
1. Claude Code: the 500 body (generic message + `support.room_url`).
2. Room: blue bubbles (customer agent) vs gray Agent37 bubbles with the Agent37 logo; status rail on the right.
3. "Logs · Grafana" card: click "Open in Grafana", show the RangeError for that request_id.
4. Room: "Reproduced in sandbox", then "Fix verified on dev server" (speed up 4x in Screen Studio).
5. CorgiPay Release (Agent37) reviews, merges; rail hits "Deployed to prod".
6. Claude Code retry: 201. Dashboard: the Corgi Cafe invoice slides in as "Sent".
7. OpenAI postmortem card in the room.

## Timing
Error to fixed in prod: about 2 to 3 minutes. Full take: about 4 minutes before editing.

## If something is really broken
- Room page blank / 502: `ssh meetproxy 'sudo systemctl restart meetproxy'`
- Prod dashboard down: `ssh meetproxy 'sudo systemctl restart corgipay'`
- Agent37 never replies: check the room for an error card; rerun the take after `reset-demo.sh`.
