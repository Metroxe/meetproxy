#!/usr/bin/env bash
# Deploy the room server to the meetproxy VM (public at https://corgipay.boilerroom.tech/support).
# Usage: ./deploy.sh   (needs the `meetproxy` ssh alias)
set -euo pipefail
cd "$(dirname "$0")"

rsync -az --delete \
  --exclude node_modules --exclude .git --exclude .env --exclude '.env.*' \
  --exclude cache --exclude logs --exclude '*.log' \
  ./ meetproxy:/opt/meetproxy/

ssh meetproxy 'set -e
  cd /opt/meetproxy
  if [ -f package-lock.json ]; then npm ci --omit=dev --no-audit --no-fund; elif [ -f package.json ]; then npm install --omit=dev --no-audit --no-fund; fi
  sudo /usr/bin/systemctl enable meetproxy >/dev/null 2>&1 || true
  sudo /usr/bin/systemctl restart meetproxy
  for i in $(seq 1 20); do
    code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8791/support || true)
    [ "$code" != "000" ] && { echo "meetproxy up (local /support -> $code)"; exit 0; }
    sleep 0.5
  done
  echo "meetproxy did not answer on :8791; last logs:"; journalctl -u meetproxy -n 30 --no-pager -o cat; exit 1'
echo "public: $(curl -s -o /dev/null -w '%{http_code}' https://corgipay.boilerroom.tech/support)"
