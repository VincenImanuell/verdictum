#!/usr/bin/env bash
# Add the "Sell Me This Pen" challenge to the ALREADY-DEPLOYED VerdictumJudge.
# No full redeploy — addChallenge is additive and owner-only. Idempotent: skips if already present.
set -euo pipefail
cd "$(dirname "$0")/.."

set -a; source .env; set +a            # PRIVATE_KEY, ADDRESS (deployer = owner)
source script/addresses.env            # JUDGE, ...
RPC=https://dream-rpc.somnia.network
PK="$PRIVATE_KEY"

PEN=$(cast keccak 'sell-me-this-pen-v2')
LABEL="Sell Me This Pen"
PERSONA="$(cat script/personas/sell-me-this-pen.txt)"

echo "Judge   : $JUDGE"
echo "Sender  : $ADDRESS"
echo "PEN id  : $PEN"
echo "Owner   : $(cast call "$JUDGE" 'OWNER()(address)' --rpc-url "$RPC" 2>/dev/null || echo '?')"
echo "Balance : $(cast balance "$ADDRESS" --rpc-url "$RPC" --ether 2>/dev/null || echo '?') STT"

# Already registered? (challenges(id) -> (label, persona, exists))
EXISTS=$(cast call "$JUDGE" 'challenges(bytes32)(string,string,bool)' "$PEN" --rpc-url "$RPC" 2>/dev/null | tail -1 || echo "false")
if [ "$EXISTS" = "true" ]; then
  echo "✓ Already registered — nothing to do."
  exit 0
fi

echo ">> addChallenge: Sell Me This Pen..."
cast send "$JUDGE" "addChallenge(bytes32,string,string)" "$PEN" "$LABEL" "$PERSONA" \
  --rpc-url "$RPC" --private-key "$PK" >/dev/null

echo "challengeCount = $(cast call "$JUDGE" 'challengeCount()(uint256)' --rpc-url "$RPC")"
echo "label on-chain = $(cast call "$JUDGE" 'challenges(bytes32)(string,string,bool)' "$PEN" --rpc-url "$RPC" | head -1)"
echo "✓ done."
