import { useEffect, useRef, useState } from "react";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { parseEther } from "viem";
import { ADDR, judgeAbi, inspAbi, platformAbi } from "../contracts";
import { useAppDispatch } from "../hooks";
import { triggerRefresh } from "../uiSlice";

const FOCUS_DESC: Record<string, { en: string }> = {
  EVIDENCE: { en: "concrete proof, data & numbers" },
  METHODOLOGY: { en: "sound, rigorous method" },
  NOVELTY: { en: "originality & contribution" },
  ROLE_FIT: { en: "direct relevance to the role" },
  HONESTY: { en: "candor & owned limits" },
  OVERALL: { en: "all qualities, balanced" },
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function SeasonBanner() {
  const dispatch = useAppDispatch();
  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const client = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [season, setSeason] = useState(0);
  const [focus, setFocus] = useState("OVERALL");
  const [strictness, setStrictness] = useState(50);
  const [dueAt, setDueAt] = useState(0);
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));
  const [busy, setBusy] = useState(false);
  const [stamp, setStamp] = useState(false);
  const prevSeason = useRef(0);

  async function refresh() {
    if (!client) return;
    try {
      const [se, fo, st, due] = await Promise.all([
        client.readContract({ address: ADDR.judge, abi: judgeAbi, functionName: "currentSeason" }),
        client.readContract({ address: ADDR.judge, abi: judgeAbi, functionName: "currentFocus" }),
        client.readContract({ address: ADDR.judge, abi: judgeAbi, functionName: "currentStrictness" }),
        client.readContract({ address: ADDR.inspector, abi: inspAbi, functionName: "seasonDueAt" }),
      ]);
      const sNum = Number(se);
      if (prevSeason.current && sNum > prevSeason.current) {
        setStamp(true);
        setTimeout(() => setStamp(false), 600);
        dispatch(triggerRefresh());
      }
      prevSeason.current = sNum;
      setSeason(sNum);
      setFocus((fo as string) || "OVERALL");
      setStrictness(Number(st));
      setDueAt(Number(due));
    } catch {
      /* a season-aware Governor may not be wired yet */
    }
  }

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]);
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = Math.max(0, dueAt - now);
  const due = dueAt > 0 && remaining <= 0;
  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;
  const gate =
    strictness < 40
      ? { en: "lenient", c: "var(--pass)" }
      : strictness < 70
        ? { en: "tightening", c: "var(--amber)" }
        : { en: "severe", c: "var(--fail)" };
  const fd = FOCUS_DESC[focus] || FOCUS_DESC.OVERALL;

  async function advance() {
    if (!isConnected) {
      openConnectModal?.();
      return;
    }
    if (!client || busy) return;
    setBusy(true);
    const before = season;
    try {
      const floor = (await client.readContract({ address: ADDR.platform, abi: platformAbi, functionName: "getRequestDeposit" })) as bigint;
      const tx = await writeContractAsync({ address: ADDR.inspector, abi: inspAbi, functionName: "advanceSeason", value: floor + parseEther("0.21") });
      await client.waitForTransactionReceipt({ hash: tx });
      for (let i = 0; i < 60; i++) {
        await sleep(4000);
        await refresh();
        if (prevSeason.current > before) break;
      }
    } catch (e) {
      const msg = (e as { shortMessage?: string; message?: string }).shortMessage ?? (e as Error).message ?? String(e);
      alert(msg);
    } finally {
      setBusy(false);
    }
  }

  if (season === 0) return null; // no season-aware Governor wired

  return (
    <div className="seasonbar">
      <div className="wrap seasonrow">
        <div className="row" style={{ gap: 14 }}>
          <div className={`seal seasonseal${stamp ? " stamp" : ""}`}>S{season}</div>
          <div>
            <div className="eyebrow">EXAM SEASON</div>
            <div className="seasonttl serif">
              {`Season ${season} · The Court of `}
              <span style={{ color: "var(--gold)" }}>{focus}</span>
            </div>
            <div className="faint" style={{ fontSize: 11.5 }}>
              scrutinising {fd.en} · chosen by the AI, no human
            </div>
          </div>
        </div>
        <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
          <span className="pill" style={{ borderColor: gate.c }}>
            <span className="dot" style={{ background: gate.c }} /> gate {strictness}/100 ·{" "}
            <b style={{ color: gate.c }}>{gate.en}</b>
          </span>
          <span className="pill mono" title="until the season may advance">
            ⏳ {due ? "season due" : `${mm}:${ss.toString().padStart(2, "0")}`}
          </span>
          <button className="btn" disabled={busy || !due} onClick={advance}>
            {busy ? "recalibrating…" : "Advance season 🔁"}
          </button>
        </div>
      </div>
    </div>
  );
}
