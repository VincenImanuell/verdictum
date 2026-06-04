import { useEffect, useRef, useState } from "react";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { parseEther } from "viem";
import { ADDR, judgeAbi, inspAbi, platformAbi } from "../contracts";
import { useLang } from "../i18n";

const FOCUS_DESC: Record<string, { en: string; id: string }> = {
  EVIDENCE: { en: "concrete proof, data & numbers", id: "bukti konkret, data & angka" },
  METHODOLOGY: { en: "sound, rigorous method", id: "metode yang kuat & rigor" },
  NOVELTY: { en: "originality & contribution", id: "orisinalitas & kontribusi" },
  ROLE_FIT: { en: "direct relevance to the role", id: "relevansi langsung ke peran" },
  HONESTY: { en: "candor & owned limits", id: "kejujuran & akui batas" },
  OVERALL: { en: "all qualities, balanced", id: "semua kualitas, seimbang" },
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function SeasonBanner({ onChange }: { onChange?: () => void }) {
  const { lang, t } = useLang();
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
        onChange?.();
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
      ? { en: "lenient", id: "lunak", c: "var(--pass)" }
      : strictness < 70
        ? { en: "tightening", id: "mengetat", c: "var(--amber)" }
        : { en: "severe", id: "ketat", c: "var(--fail)" };
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
            <div className="eyebrow">{t("EXAM SEASON", "MUSIM UJIAN")}</div>
            <div className="seasonttl serif">
              {t(`Season ${season} · The Court of `, `Musim ${season} · Pengadilan `)}
              <span style={{ color: "var(--gold)" }}>{focus}</span>
            </div>
            <div className="faint" style={{ fontSize: 11.5 }}>
              {t("scrutinising ", "menyorot ")}
              {lang === "en" ? fd.en : fd.id} · {t("chosen by the AI, no human", "dipilih AI, tanpa manusia")}
            </div>
          </div>
        </div>
        <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
          <span className="pill" style={{ borderColor: gate.c }}>
            <span className="dot" style={{ background: gate.c }} /> {t("gate", "gerbang")} {strictness}/100 ·{" "}
            <b style={{ color: gate.c }}>{lang === "en" ? gate.en : gate.id}</b>
          </span>
          <span className="pill mono" title={t("until the season may advance", "sampai musim bisa berganti")}>
            ⏳ {due ? t("season due", "musim jatuh tempo") : `${mm}:${ss.toString().padStart(2, "0")}`}
          </span>
          <button className="btn" disabled={busy || !due} onClick={advance}>
            {busy ? t("recalibrating…", "rekalibrasi…") : t("Advance season 🔁", "Ganti musim 🔁")}
          </button>
        </div>
      </div>
    </div>
  );
}
