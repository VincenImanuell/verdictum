#!/usr/bin/env bash
# Live proof of the autonomous-season mechanism: advance the season (AI picks a new focus, no human),
# then submit and confirm the minted cert is stamped with the live Season + Focus.
set -uo pipefail
cd "$(dirname "$0")/.."
set -a; source .env; source script/addresses.env; set +a
RPC=https://dream-rpc.somnia.network
JOB=$(cast keccak 'job-screening')
DEPOSIT=$(cast --to-wei 0.24 ether)
verdname() { case "$1" in 1) echo PASS;; 2) echo REVISE;; 3) echo FAIL;; *) echo NONE;; esac; }

echo "=== BEFORE ==="
echo "season=$(cast call "$JUDGE" 'currentSeason()(uint32)' --rpc-url "$RPC")  focus=$(cast call "$JUDGE" 'currentFocus()(string)' --rpc-url "$RPC")  strictness=$(cast call "$JUDGE" 'currentStrictness()(uint8)' --rpc-url "$RPC")"

due=$(cast call "$INSP" 'seasonDueAt()(uint256)' --rpc-url "$RPC" | awk '{print $1}'); now=$(date +%s)
if [ "$now" -ge "$due" ]; then
  pre=$(cast call "$INSP" 'season()(uint32)' --rpc-url "$RPC")
  echo ">> advanceSeason() — the board picks the next focus in consensus (no human)..."
  cast send "$INSP" 'advanceSeason()' --value "$DEPOSIT" --rpc-url "$RPC" --private-key "$PRIVATE_KEY" >/dev/null 2>&1 || true
  for i in $(seq 1 40); do
    sleep 5
    cur=$(cast call "$INSP" 'season()(uint32)' --rpc-url "$RPC")
    if [ "$cur" != "$pre" ]; then break; fi
  done
  echo "=== AFTER advanceSeason ==="
  echo "season=$(cast call "$JUDGE" 'currentSeason()(uint32)' --rpc-url "$RPC")  focus=$(cast call "$JUDGE" 'currentFocus()(string)' --rpc-url "$RPC")"
else
  echo "(season not due for $((due - now))s — skipping advanceSeason this run)"
fi

echo ">> submit a strong application under the current season..."
pre=$(cast call "$JUDGE" 'lastRequestId()(uint256)' --rpc-url "$RPC")
APP="I am applying for the Backend Engineer role on your payments team. At Lunabank I owned the transaction-ledger service in Go and PostgreSQL handling about 4000 writes per second; I led a migration to a sharded setup that cut p99 write latency from 220ms to 40ms and added idempotency keys that dropped duplicate-charge chargebacks to zero. Your posting emphasises reconciliation and exactly-once processing, which is exactly the problem space I have worked in."
cast send "$JUDGE" "submit(bytes32,string)" "$JOB" "$APP" --value "$DEPOSIT" --rpc-url "$RPC" --private-key "$PRIVATE_KEY" >/dev/null 2>&1 || true
for i in $(seq 1 40); do
  sleep 5
  cur=$(cast call "$JUDGE" 'lastRequestId()(uint256)' --rpc-url "$RPC")
  if [ "$cur" != "$pre" ]; then break; fi
done
v=$(cast call "$JUDGE" 'lastVerdict()(uint8)' --rpc-url "$RPC")
tok=$(cast call "$JUDGE" 'lastTokenId()(uint256)' --rpc-url "$RPC")
echo "verdict=$v ($(verdname "$v"))  tokenId=$tok"
if [ "$tok" != "0" ] && [ -n "$tok" ]; then
  echo "=== minted credential (season+focus stamped) ==="
  cast call "$CRED" 'credentialOf(uint256)(string,uint64,uint8,address,uint32,string)' "$tok" --rpc-url "$RPC"
fi
echo "=== season verify done ==="
