import { useEffect, useState, type ReactNode } from "react";
import { useAccount, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { parseEther, parseEventLogs } from "viem";
import { ADDR, judgeAbi, platformAbi, type Challenge } from "../contracts";
import { EXPLORER } from "../wagmi";
import Consensus from "./Consensus";
import CredentialCard from "./CredentialCard";

const VWORD: Record<number, { en: string; cls: string; noteEn: string }> = {
  1: { en: "PASS", cls: "pass", noteEn: "Advanced. Specific, evidenced, and convincing." },
  2: { en: "REVISE", cls: "revise", noteEn: "Promising, but tighten the specifics and evidence." },
  3: { en: "FAIL", cls: "fail", noteEn: "Not advanceable — generic, unsupported, or a manipulation attempt." },
  0: { en: "NO CONSENSUS", cls: "revise", noteEn: "Validators did not reach consensus — try again." },
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function SubmitPanel({ challenge }: { challenge: Challenge }) {
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
    setSteps("Submitting transaction… confirm in your wallet");
    try {
      const floor = (await client.readContract({ address: ADDR.platform, abi: platformAbi, functionName: "getRequestDeposit" })) as bigint;
      const value = floor + parseEther("0.21");
      const hash = await writeContractAsync({ address: ADDR.judge, abi: judgeAbi, functionName: "submit", args: [challenge.id, text], value });
      setSteps("In the mempool, awaiting a block");
      const rcpt = await client.waitForTransactionReceipt({ hash });
      const subs = parseEventLogs({ abi: judgeAbi, eventName: "Submitted", logs: rcpt.logs });
      const requestId = subs[0]?.args.requestId as bigint | undefined;
      setSteps(
        <>
          Awaiting validator consensus…{" "}
          {requestId != null && <span className="mono faint">#{requestId.toString()}</span>} ·{" "}
          <a target="_blank" href={`${EXPLORER}/tx/${hash}`}>
            tx ↗
          </a>
        </>,
      );
      const res = await pollVerdict(requestId, rcpt.blockNumber);
      setAwaiting(false);
      if (!res) {
        setSteps("Timed out — please try again.");
        return;
      }
      setVerdict(res.verdict);
      setTokenId(res.tokenId);
      refetchStrictness();
    } catch (e) {
      setAwaiting(false);
      const msg = (e as { shortMessage?: string; message?: string }).shortMessage ?? (e as Error).message ?? String(e);
      alert("Submit failed: " + msg);
    }
  }

  const v = verdict != null ? VWORD[verdict] ?? VWORD[0] : null;

  return (
    <section className="section card">
      <div className="spread" style={{ marginBottom: 8 }}>
        <h2 style={{ margin: 0 }}>Make your case</h2>
        <span className="eyebrow">{challenge.title}</span>
      </div>
      <textarea maxLength={2000} placeholder={challenge.ph} value={text} onChange={(e) => setText(e.target.value)} />
      <div className="spread" style={{ marginTop: 12, flexWrap: "wrap", gap: 10 }}>
        <div className="row" style={{ fontSize: 12.5 }}>
          <span className="muted">Strictness in force</span>
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
            Submit to the Court ⚖
          </button>
        </div>
      </div>
      <div className="trust">
        Judged by an LLM running inside Somnia validator consensus (temperature 0, majority). No off-chain oracle. Costs ~0.24 STT (auto-rebated).
      </div>

      {awaiting && <Consensus>{steps}</Consensus>}

      {v && (
        <div className={`verdict ${v.cls} stamp`} style={{ marginTop: 16 }}>
          <div className="word">{v.en}</div>
          <div className="note">{v.noteEn}</div>
        </div>
      )}

      {verdict === 1 && tokenId > 0n && <CredentialCard tokenId={tokenId} />}
    </section>
  );
}
