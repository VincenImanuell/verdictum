import { useEffect, useState, type ReactNode } from "react";
import { useAccount, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { parseEther, parseEventLogs } from "viem";
import { ADDR, judgeAbi, platformAbi, type Challenge } from "../contracts";
import { EXPLORER } from "../wagmi";
import { useLang } from "../i18n";
import Consensus from "./Consensus";
import CredentialCard from "./CredentialCard";

const VWORD: Record<number, { en: string; id: string; cls: string; noteEn: string; noteId: string }> = {
  1: { en: "PASS", id: "LULUS", cls: "pass", noteEn: "Advanced. Specific, evidenced, and convincing.", noteId: "Diloloskan. Spesifik, berbukti, dan meyakinkan." },
  2: { en: "REVISE", id: "REVISI", cls: "revise", noteEn: "Promising, but tighten the specifics and evidence.", noteId: "Menjanjikan, tapi pertajam spesifik dan bukti." },
  3: { en: "FAIL", id: "TIDAK LULUS", cls: "fail", noteEn: "Not advanceable — generic, unsupported, or a manipulation attempt.", noteId: "Tidak diloloskan — generik, tanpa bukti, atau upaya manipulasi." },
  0: { en: "NO CONSENSUS", id: "TANPA KONSENSUS", cls: "revise", noteEn: "Validators did not reach consensus — try again.", noteId: "Validator tidak mencapai konsensus — coba lagi." },
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function SubmitPanel({ challenge }: { challenge: Challenge }) {
  const { lang, t } = useLang();
  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const client = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [text, setText] = useState("");
  const [awaiting, setAwaiting] = useState(false);
  const [steps, setSteps] = useState<ReactNode>(null);
  const [verdict, setVerdict] = useState<number | null>(null);
  const [tokenId, setTokenId] = useState<bigint>(0n);

  const { data: strictness, refetch: refetchStrictness } = useReadContract({
    address: ADDR.judge,
    abi: judgeAbi,
    functionName: "currentStrictness",
  });
  const s = Number(strictness ?? 50);

  const bytes = new TextEncoder().encode(text).length;
  const tooLong = bytes > 2000;
  const L = lang === "en" ? challenge.en : challenge.id_;

  useEffect(() => {
    setVerdict(null);
    setTokenId(0n);
    setAwaiting(false);
  }, [challenge.key]);

  async function pollVerdict(requestId: bigint | undefined, fromBlock: bigint) {
    if (!client) return null;
    for (let i = 0; i < 60; i++) {
      try {
        const logs = await client.getContractEvents({
          address: ADDR.judge,
          abi: judgeAbi,
          eventName: "VerdictReached",
          args: requestId != null ? { requestId } : undefined,
          fromBlock,
        });
        if (logs.length) {
          const a = logs[logs.length - 1].args;
          return { verdict: Number(a.verdict), tokenId: (a.tokenId ?? 0n) as bigint };
        }
      } catch {
        /* keep polling */
      }
      await sleep(4000);
    }
    return null;
  }

  async function onSubmit() {
    if (!isConnected) {
      openConnectModal?.();
      return;
    }
    if (!client) return;
    setAwaiting(true);
    setVerdict(null);
    setTokenId(0n);
    setSteps(t("Submitting transaction… confirm in your wallet", "Mengirim transaksi… konfirmasi di wallet"));
    try {
      const floor = (await client.readContract({ address: ADDR.platform, abi: platformAbi, functionName: "getRequestDeposit" })) as bigint;
      const value = floor + parseEther("0.21");
      const hash = await writeContractAsync({ address: ADDR.judge, abi: judgeAbi, functionName: "submit", args: [challenge.id, text], value });
      setSteps(t("In the mempool, awaiting a block", "Di mempool, menunggu block"));
      const rcpt = await client.waitForTransactionReceipt({ hash });
      const subs = parseEventLogs({ abi: judgeAbi, eventName: "Submitted", logs: rcpt.logs });
      const requestId = subs[0]?.args.requestId as bigint | undefined;
      setSteps(
        <>
          {t("Awaiting validator consensus…", "Menunggu konsensus validator…")}{" "}
          {requestId != null && <span className="mono faint">#{requestId.toString()}</span>} ·{" "}
          <a target="_blank" href={`${EXPLORER}/tx/${hash}`}>
            tx ↗
          </a>
        </>,
      );
      const res = await pollVerdict(requestId, rcpt.blockNumber);
      setAwaiting(false);
      if (!res) {
        setSteps(t("Timed out — please try again.", "Waktu habis — coba lagi."));
        return;
      }
      setVerdict(res.verdict);
      setTokenId(res.tokenId);
      refetchStrictness();
    } catch (e) {
      setAwaiting(false);
      const msg = (e as { shortMessage?: string; message?: string }).shortMessage ?? (e as Error).message ?? String(e);
      alert((lang === "en" ? "Submit failed: " : "Gagal mengirim: ") + msg);
    }
  }

  const v = verdict != null ? VWORD[verdict] ?? VWORD[0] : null;

  return (
    <section className="section card">
      <div className="spread" style={{ marginBottom: 8 }}>
        <h2 style={{ margin: 0 }}>{t("Make your case", "Ajukan pembelaanmu")}</h2>
        <span className="eyebrow">{L.title}</span>
      </div>
      <textarea maxLength={2000} placeholder={L.ph} value={text} onChange={(e) => setText(e.target.value)} />
      <div className="spread" style={{ marginTop: 12, flexWrap: "wrap", gap: 10 }}>
        <div className="row" style={{ fontSize: 12.5 }}>
          <span className="muted">{t("Strictness in force", "Strictness berlaku")}</span>
          <span className="minibar">
            <i style={{ width: `${s}%`, background: s < 40 ? "var(--pass)" : s < 70 ? "var(--amber)" : "var(--fail)" }} />
          </span>
          <span className="mono">{s}</span>
          <span className="muted">/100</span>
        </div>
        <div className="row">
          <span className="counter mono" style={{ color: tooLong ? "var(--fail)" : bytes > 1700 ? "var(--amber)" : "var(--muted)" }}>
            {bytes} / 2000
          </span>
          <button className="btn btn-primary" disabled={awaiting || text.trim().length === 0 || tooLong} onClick={onSubmit}>
            {t("Submit to the Court ⚖", "Ajukan ke Sidang ⚖")}
          </button>
        </div>
      </div>
      <div className="trust">
        {t(
          "Judged by an LLM running inside Somnia validator consensus (temperature 0, majority). No off-chain oracle. Costs ~0.24 STT (auto-rebated).",
          "Dinilai oleh LLM di dalam konsensus validator Somnia (temperature 0, majority). Tanpa oracle off-chain. Biaya ~0.24 STT (sisa di-rebate).",
        )}
      </div>

      {awaiting && <Consensus>{steps}</Consensus>}

      {v && (
        <div className={`verdict ${v.cls} stamp`} style={{ marginTop: 16 }}>
          <div className="eyebrow">{lang === "en" ? v.id : v.en}</div>
          <div className="word">{lang === "en" ? v.en : v.id}</div>
          <div className="note">{lang === "en" ? v.noteEn : v.noteId}</div>
        </div>
      )}

      {verdict === 1 && tokenId > 0n && <CredentialCard tokenId={tokenId} />}
    </section>
  );
}
