#!/usr/bin/env bash
# The HEARTBEAT — a keeper that makes the world run ITSELF. It pokes the Governor's two PERMISSIONLESS
# functions on a clock: tick() (recalibrate strictness via inferNumber) and advanceSeason() (pick the
# next season focus via inferString, when the season timer is due). The keeper decides NOTHING — the
# LLM-in-consensus does; it only pokes public functions a spammer could also call. Each poke is wrapped
# so a too-early/in-flight revert is a harmless no-op. Run during the demo (it costs ~0.24 STT per real
# call); set a short seasonLength first (deploy_v2.sh sets 120s).
#
#   TICK_EVERY=180 POLL=30 bash script/heartbeat.sh
set -uo pipefail
cd "$(dirname "$0")/.."
set -a; source .env; source script/addresses.env; set +a
RPC=https://dream-rpc.somnia.network
DEPOSIT=$(cast --to-wei 0.24 ether)
TICK_EVERY=${TICK_EVERY:-180} # strictness recalibration cadence (seconds)
POLL=${POLL:-30} # how often to check whether a season is due (seconds)

echo "heartbeat: Governor=$INSP — tick every ${TICK_EVERY}s, season-check every ${POLL}s. No human decides anything."
last_tick=0
while true; do
  now=$(date +%s)

  # advance the season whenever the on-chain timer says it is due (the time gate makes an early poke a
  # safe revert -> no-op). The LLM picks the new focus in consensus.
  due=$(cast call "$INSP" 'seasonDueAt()(uint256)' --rpc-url "$RPC" 2>/dev/null || echo 0)
  if [ -n "$due" ] && [ "$due" != "0" ] && [ "$now" -ge "$due" ]; then
    echo "[$(date +%T)] season due -> advanceSeason()"
    cast send "$INSP" 'advanceSeason()' --value "$DEPOSIT" --rpc-url "$RPC" --private-key "$PRIVATE_KEY" >/dev/null 2>&1 || true
  fi

  # periodic strictness recalibration
  if [ $((now - last_tick)) -ge "$TICK_EVERY" ]; then
    echo "[$(date +%T)] tick() -> recalibrate strictness in consensus"
    cast send "$INSP" 'tick()' --value "$DEPOSIT" --rpc-url "$RPC" --private-key "$PRIVATE_KEY" >/dev/null 2>&1 || true
    last_tick=$now
  fi

  sleep "$POLL"
done
