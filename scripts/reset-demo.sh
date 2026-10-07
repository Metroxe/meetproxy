#!/usr/bin/env bash
# Put the planted bug back in CorgiPay prod after a demo run fixed it, so the demo can be recorded again.
# Usage: scripts/reset-demo.sh [path-to-corgipay-clone]   (default ~/Documents/projects/corgipay)
set -euo pipefail
REPO="${1:-$HOME/Documents/projects/corgipay}"
cd "$REPO"
git checkout -q main && git pull -q --ff-only
if grep -q 'return BigInt(amount) \* 100n' invoices.mjs; then echo "bug already present at $(git rev-parse --short HEAD)"; exit 0; fi
# Replace whatever conversion the support agent wrote inside toCents() with the buggy one.
node -e '
const fs=require("fs");let s=fs.readFileSync("invoices.mjs","utf8");
s=s.replace(/(export function toCents\(amount\) \{[\s\S]*?\n)(\s*)return [^\n]*\n\}/, (m,head,ind)=>head+ind+"return BigInt(amount) * 100n\n}");
fs.writeFileSync("invoices.mjs",s)'
grep -n 'return BigInt(amount) \* 100n' invoices.mjs
git commit -qam "demo reset: reintroduce the cents bug in toCents()"
git push -q origin main
echo "pushed $(git rev-parse --short HEAD); prod redeploys in a few seconds"
