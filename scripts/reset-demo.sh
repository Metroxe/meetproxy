#!/usr/bin/env bash
# Put the planted cents bug back in CorgiPay prod after a demo run fixed it, so the demo can be recorded again.
# Restores invoices.mjs (+ its test) wholesale from a known-buggy commit, so it works however the agents wrote the fix.
# Only those two files are committed, so other in-progress edits in the clone are left alone.
# Usage: scripts/reset-demo.sh [path-to-corgipay-clone]   (default ~/Documents/projects/corgipay)
set -euo pipefail
REPO="${1:-$HOME/Documents/projects/corgipay}"
BUGGY=f9cee57   # invoices.mjs with `return BigInt(amount) * 100n` in toCents()
cd "$REPO"
git checkout -q main
git pull -q --rebase --autostash origin main
git show "$BUGGY:invoices.mjs" > invoices.mjs
git show "$BUGGY:invoices.test.mjs" > invoices.test.mjs
# Prove the bug is really there: $58.50 must throw, $36 must work.
node --input-type=module -e "
import { toCents } from './invoices.mjs'
let threw = false; try { toCents(58.5) } catch { threw = true }
if (!threw || toCents(36) !== 3600n) { console.error('reset check FAILED'); process.exit(1) }
console.log('local check: 58.50 throws, 36.00 works')"
if git diff --quiet -- invoices.mjs invoices.test.mjs; then
  echo "bug already present at $(git rev-parse --short HEAD)"
else
  git commit -q -m "demo reset: reintroduce the cents bug in toCents()" -- invoices.mjs invoices.test.mjs
  git push -q origin main
  echo "pushed $(git rev-parse --short HEAD)"
fi
# Clean slate for the take: clear the dashboard's failed-request rows and close leftover support rooms.
ssh meetproxy 'echo "[]" | sudo tee /opt/corgipay/data/incidents.json >/dev/null; sudo systemctl restart corgipay; set -a; . /opt/meetproxy/.env; set +a; psql "$DATABASE_URL" -qtAc "update rooms set closed=true where not closed" >/dev/null' \
  && echo "cleared old API errors and closed old support rooms" || echo "WARNING: could not clear old errors (ssh meetproxy failed)"
# Wait until prod is serving this commit.
want=$(git rev-parse HEAD)
for i in $(seq 1 20); do
  got=$(curl -s https://corgipay.boilerroom.tech/version | sed -n 's/.*"sha": *"\([0-9a-f]*\)".*/\1/p')
  if [ "$got" = "$want" ]; then echo "prod is on ${want:0:7}: bug is live, ready for a take"; exit 0; fi
  sleep 1.5
done
echo "WARNING: prod still on ${got:0:7}, expected ${want:0:7}. Check: ssh meetproxy 'sudo journalctl -u corgipay-deployer -n 20'"
exit 1
