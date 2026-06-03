import { useState } from "react";
import { useAccount, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { parseEther } from "viem";
import { ADDR, inspAbi, judgeAbi, platformAbi } from "../contracts";
import { EXPLORER } from "../wagmi";
import { useLang } from "../i18n";
import Consensus from "./Consensus";

const ARC = Math.PI * 90; // semicircle length
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function InspectorPanel() {
  const { lang, t } = useLang();
  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const client = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const { data: strictness, refetch: refetchStrictness } = useReadContract({ address: ADDR.judge, abi: judgeAbi, functionName: "currentStrictness" });
  const { data: tickCount, refetch: refetchTicks } = useReadContract({ address: ADDR.inspector, abi: inspAbi, functionName: "tickCount" });

  const [busy, setBusy] = useState(false);
  const [steps, setSteps] = useState<React.ReactNode>(null);
  const [delta, setDelta] = useState<string | null>(null);

  const s = Math.max(0, Math.min(100, Number(strictness ?? 50)));
  const col = s < 40 ? "#34D399" : s < 70 ? "#F5B544" : "#F26D6D";
  const dash = ((s / 100) * ARC).toFixed(1);
  const rot = (-90 + (s / 100) * 180).toFixed(1);

  async function tick() {
    if (!isConnected) {
      openConnectModal?.();
      return;
    }
    if (!client) return;
    setBusy(true);
    setDelta(null);
    const before = Number(tickCount ?? 0n);
    const prevS = s;
    setSteps(t("Recalibrating… confirm, then await consensus", "Rekalibrasi… konfirmasi, lalu tunggu konsensus"));
    try {
      const floor = (await client.readContract({ address: ADDR.platform, abi: platformAbi, functionName: "getRequestDeposit" })) as bigint;
      const value = floor + parseEther("0.21");
      const hash = await writeContractAsync({ address: ADDR.inspector, abi: inspAbi, functionName: "tick", value });
      setSteps(
        <>
          {t("Awaiting validator consensus…", "Menunggu konsensus validator…")} ·{" "}
          <a target="_blank" href={`${EXPLORER}/tx/${hash}`}>
            tx ↗
          </a>
        </>,
      );
      await client.waitForTransactionReceipt({ hash });
      for (let i = 0; i < 60; i++) {
        await sleep(4000);
        const tc = Number(await client.readContract({ address: ADDR.inspector, abi: inspAbi, functionName: "tickCount" }));
        if (tc > before) {
          const ns = Number(await client.readContract({ address: ADDR.judge, abi: judgeAbi, functionName: "currentStrictness" }));
          setDelta(`${prevS} → ${ns}${ns > prevS ? " · the world tightened" : ""}`);
          refetchStrictness();
          refetchTicks();
          break;
        }
      }
    } catch (e) {
      const msg = (e as { shortMessage?: string; message?: string }).shortMessage ?? (e as Error).message ?? String(e);
      alert(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="section card">
      <div>
        <h2 style={{ margin: 0 }}>{t("The Inspector — autonomy", "Sang Inspektur — otonomi")}</h2>
        <p className="muted" style={{ margin: "4px 0 0", maxWidth: 440, fontSize: 13 }}>
          {t(
            "No human sets the difficulty. Anyone can trigger a recalibration: an AI in consensus picks the new strictness from the pass-rate — the more candidates pass, the harsher it gets.",
            "Tak ada manusia yang mengatur kesulitan. Siapa pun bisa memicu rekalibrasi: AI dalam konsensus memilih strictness baru dari tingkat kelulusan — makin banyak yang lulus, makin ketat.",
          )}
        </p>
      </div>
      <div className="gaugewrap" style={{ marginTop: 14 }}>
        <svg className="gauge" width="240" height="150" viewBox="0 0 240 150">
          <path d="M 30 120 A 90 90 0 0 1 210 120" fill="none" stroke="#28324A" strokeWidth="14" strokeLinecap="round" />
          <path className="fill" d="M 30 120 A 90 90 0 0 1 210 120" fill="none" stroke={col} strokeWidth="14" strokeLinecap="round" strokeDasharray={`${dash} 999`} />
          <g className="needle" transform={`rotate(${rot} 120 120)`}>
            <line x1="120" y1="120" x2="120" y2="44" stroke="#E9C46A" strokeWidth="3" />
          </g>
          <circle cx="120" cy="120" r="6" fill="#E9C46A" />
        </svg>
        <div>
          <div>
            <span className="gval">{s}</span>
            <span className="muted">/100</span>
            {delta && (
              <span className="delta" key={delta}>
                {delta}
              </span>
            )}
          </div>
          <div className="zone">
            <span>{t("lenient · balanced · severe", "lunak · seimbang · ketat")}</span> ·{" "}
            <span className="mono">
              {Number(tickCount ?? 0n)}× {t("recalibrated", "rekalibrasi")}
            </span>
          </div>
          <button className="btn" style={{ marginTop: 12 }} disabled={busy} onClick={tick}>
            {t("Trigger recalibration (tick) 🔁", "Picu rekalibrasi (tick) 🔁")}
          </button>
        </div>
      </div>
      {busy && <Consensus>{steps}</Consensus>}
    </section>
  );
}
