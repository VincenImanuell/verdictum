#!/usr/bin/env bash
# Deploy the multi-challenge Verdictum set on Somnia Shannon.
# One contract per tx, LIVE gas estimate (forge create / cast send) — never forge script (Somnia ~15x gas).
set -euo pipefail
cd "$(dirname "$0")/.."

set -a; source .env; set +a   # PRIVATE_KEY, ADDRESS
RPC=https://dream-rpc.somnia.network
AGENT=12847293847561029384
PK="$PRIVATE_KEY"

create() {  # $1 = path:Name ; remaining = constructor args
  local target="$1"; shift
  local out
  if [ "$#" -gt 0 ]; then
    out=$(forge create "$target" --rpc-url "$RPC" --private-key "$PK" --broadcast --json --constructor-args "$@" 2>/tmp/fc.err) || true
  else
    out=$(forge create "$target" --rpc-url "$RPC" --private-key "$PK" --broadcast --json 2>/tmp/fc.err) || true
  fi
  local addr
  addr=$(printf '%s' "$out" | python3 -c "import sys,json;print(json.load(sys.stdin)['deployedTo'])" 2>/dev/null) || true
  if [ -z "$addr" ]; then
    echo "DEPLOY FAILED for $target" >&2; echo "$out" >&2; cat /tmp/fc.err >&2; exit 1
  fi
  printf '%s' "$addr"
}

send() { cast send "$@" --rpc-url "$RPC" --private-key "$PK" >/dev/null; }
call() { cast call "$@" --rpc-url "$RPC"; }

echo ">> Deploying VerdictumJudge..."
JUDGE=$(create src/VerdictumJudge.sol:VerdictumJudge "$AGENT");        echo "   JUDGE=$JUDGE"
echo ">> Deploying Credential(judge)..."
CRED=$(create src/Credential.sol:Credential "$JUDGE");                 echo "   CRED=$CRED"
echo ">> setCredential..."
send "$JUDGE" "setCredential(address)" "$CRED"
echo "   credential() = $(call "$JUDGE" 'credential()(address)')"
echo "   cred.JUDGE() = $(call "$CRED" 'JUDGE()(address)')"
echo ">> Deploying Inspector(agent, cred)..."
INSP=$(create src/Inspector.sol:Inspector "$AGENT" "$CRED");           echo "   INSP=$INSP"
echo ">> setInspector..."
send "$JUDGE" "setInspector(address)" "$INSP"
echo "   currentStrictness = $(call "$JUDGE" 'currentStrictness()(uint8)')  inspector.strictness = $(call "$INSP" 'strictness()(uint8)')"

JOB=$(cast keccak 'job-screening')
THESIS=$(cast keccak 'thesis-defense')
MOM=$(cast keccak 'defend-from-mom')

echo ">> addChallenge: Job Application Screening (flagship)..."
send "$JUDGE" "addChallenge(bytes32,string,string)" "$JOB" "Job Application Screening" "$(cat script/personas/job-screening.txt)"
echo ">> addChallenge: SIDANG Thesis Defense (heritage)..."
send "$JUDGE" "addChallenge(bytes32,string,string)" "$THESIS" "SIDANG - Thesis Defense" "$(cat script/personas/thesis-defense.txt)"
echo ">> addChallenge: Defend Yourself From Mom (free/fun)..."
send "$JUDGE" "addChallenge(bytes32,string,string)" "$MOM" "Defend Yourself From Mom" "$(cat script/personas/defend-from-mom.txt)"

echo "   challengeCount = $(call "$JUDGE" 'challengeCount()(uint256)')"

cat > script/addresses.env <<EOF
JUDGE=$JUDGE
CRED=$CRED
INSP=$INSP
JOB_ID=$JOB
THESIS_ID=$THESIS
MOM_ID=$MOM
EOF

echo ""
echo "=== DEPLOYED MULTI-CHALLENGE SET (Shannon, chain 50312) ==="
echo "JUDGE=$JUDGE"
echo "CRED=$CRED"
echo "INSP=$INSP"
echo "JOB_ID=$JOB"
echo "THESIS_ID=$THESIS"
echo "MOM_ID=$MOM"
echo "(wrote script/addresses.env — smoke_test.sh / jailbreak_gauntlet.sh read it)"
