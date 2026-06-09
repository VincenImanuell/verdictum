import { useCallback, useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import type { Address, Hex } from "viem";
import { ADDR, judgeAbi, HIDDEN_CHALLENGE_IDS, type Challenge } from "./contracts";
import { useAppDispatch } from "./hooks";
import { setCommunity } from "./uiSlice";

// First sentence of the persona, trimmed — used as the tile sub-line so a community tile reads like a
// curated one instead of dumping the whole role prompt.
function teaser(persona: string): string {
  const first = persona.split(/(?<=[.!?])\s/)[0] ?? persona;
  return first.length > 116 ? first.slice(0, 113).trimEnd() + "…" : first;
}

/// Enumerate user-created examiners from the judge contract and push them into Redux. Mounted once
/// (in ChallengePicker); returns a refetch() to call right after a createChallenge tx confirms.
export function useCommunityChallenges() {
  const client = usePublicClient();
  const dispatch = useAppDispatch();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!client) return;
      const read = (functionName: string, args?: readonly unknown[]) =>
        client.readContract({ address: ADDR.judge, abi: judgeAbi, functionName, args } as never);

      const count = Number((await read("challengeCount")) as bigint);
      const ids = (await Promise.all(
        Array.from({ length: count }, (_, i) => read("challengeIds", [BigInt(i)]) as Promise<Hex>),
      )).filter((id) => !HIDDEN_CHALLENGE_IDS.has(id.toLowerCase()));

      const out: Challenge[] = (
        await Promise.all(
          ids.map(async (id) => {
            const [ch, creator] = await Promise.all([
              read("challenges", [id]) as Promise<readonly [string, string, boolean]>,
              read("challengeCreator", [id]) as Promise<Address>,
            ]);
            if (!ch[2]) return null; // !exists — defensive
            return {
              key: id,
              id,
              label: ch[0],
              title: ch[0],
              icon: "✦",
              sub: teaser(ch[1]),
              ph: `Make your case for “${ch[0]}”. Be specific, concrete, and genuinely convincing…`,
              community: true,
              creator,
            } as Challenge;
          }),
        )
      ).filter((c): c is Challenge => c !== null);

      if (!cancelled) dispatch(setCommunity(out));
    })().catch(console.warn);
    return () => {
      cancelled = true;
    };
  }, [client, dispatch, tick]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);
  return { refetch };
}
