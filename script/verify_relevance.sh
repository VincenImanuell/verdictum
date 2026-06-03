#!/usr/bin/env bash
# Verify the relevance fix: off-topic text must NOT pass the hardened "mom" challenge, and the
# flagship must reject an off-topic excuse too; a genuine excuse must still PASS.
set -uo pipefail
cd "$(dirname "$0")/.."
set -a; source .env; source script/addresses.env; set +a
RPC=https://dream-rpc.somnia.network
MOMV2=$(cast keccak 'defend-from-mom-v2')
JOB=$(cast keccak 'job-screening')
DEPOSIT=$(cast --to-wei 0.24 ether)
verdname(){ case "$1" in 1) echo PASS;; 2) echo REVISE;; 3) echo FAIL;; *) echo NONE/timeout;; esac; }

fire(){ # $1 challengeId $2 text -> echoes verdict number
  local pre; pre=$(cast call "$JUDGE" 'lastRequestId()(uint256)' --rpc-url "$RPC")
  cast send "$JUDGE" "submit(bytes32,string)" "$1" "$2" --value "$DEPOSIT" --rpc-url "$RPC" --private-key "$PRIVATE_KEY" >/dev/null 2>&1
  local i cur
  for i in $(seq 1 40); do
    sleep 5
    cur=$(cast call "$JUDGE" 'lastRequestId()(uint256)' --rpc-url "$RPC")
    if [ "$cur" != "$pre" ]; then cast call "$JUDGE" 'lastVerdict()(uint8)' --rpc-url "$RPC"; return; fi
  done
  echo x
}

JOBTEXT="I am applying for the Backend Engineer role on your payments team. At Lunabank I owned the transaction-ledger service in Go and PostgreSQL handling about 4000 writes per second at peak; I led a migration to a sharded setup that cut p99 write latency from 220ms to 40ms and onboarded three merchant regions with no downtime, and added idempotency keys that dropped duplicate-charge chargebacks to zero. Your posting emphasises reconciliation and exactly-once processing, which is exactly the problem space I have been working in."
EXCUSE="Bu, aku ngaku telat pulang karena keasyikan ngerjain tugas kelompok di rumah teman dan lupa kabar, itu salahku. Besok aku set alarm jam 5 sore biar inget pulang, dan aku bakal selalu chat dulu kalau bakal telat. Maaf bikin ibu khawatir."

echo "=== relevance fix verification (live, on-chain) ==="
echo "1) JOB cover letter -> MOM (expect NOT PASS): $(verdname "$(fire "$MOMV2" "$JOBTEXT")")"
echo "2) genuine excuse   -> MOM (expect PASS):     $(verdname "$(fire "$MOMV2" "$EXCUSE")")"
echo "3) genuine excuse   -> JOB flagship (expect NOT PASS): $(verdname "$(fire "$JOB" "$EXCUSE")")"
echo "=== done ==="
