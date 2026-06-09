import { useState } from "react";
import { useAccount, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { formatEther, parseEther, parseEventLogs, type Hex } from "viem";
import { ADDR, judgeAbi, type Challenge } from "../contracts";

const MAX_LABEL = 64;
const MAX_PERSONA = 2400;

function teaser(persona: string): string {
  const first = persona.split(/(?<=[.!?])\s/)[0] ?? persona;
  return first.length > 116 ? first.slice(0, 113).trimEnd() + "…" : first;
}

/// Modal form to register a permissionless community examiner via createChallenge(label, persona).
/// On success it hands the new Challenge back so the picker can insert + select it immediately.
export default function CreateChallengeModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (c: Challenge) => void;
}) {
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const client = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { data: feeWei } = useReadContract({ address: ADDR.judge, abi: judgeAbi, functionName: "CREATE_CHALLENGE_FEE" });

  const [label, setLabel] = useState("");
  const [persona, setPersona] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const enc = (s: string) => new TextEncoder().encode(s).length;
  const labelBytes = enc(label);
  const personaBytes = enc(persona);
  const valid = labelBytes > 0 && labelBytes <= MAX_LABEL && personaBytes > 0 && personaBytes <= MAX_PERSONA;
  const fee = (feeWei as bigint | undefined) ?? parseEther("0.5");
  const feeStr = formatEther(fee);

  async function onCreate() {
    if (!isConnected) {
      openConnectModal?.();
      return;
    }
    if (!client || !valid || busy) return;
    setBusy(true);
    setStatus("Confirm in your wallet…");
    try {
      const hash = await writeContractAsync({
        address: ADDR.judge,
        abi: judgeAbi,
        functionName: "createChallenge",
        args: [label.trim(), persona.trim()],
        value: fee,
      });
      setStatus("Registering examiner on-chain…");
      const rcpt = await client.waitForTransactionReceipt({ hash });
      const logs = parseEventLogs({ abi: judgeAbi, eventName: "ChallengeCreated", logs: rcpt.logs });
      const id = logs[0]?.args.id as Hex | undefined;
      if (!id) throw new Error("ChallengeCreated event not found");
      onCreated({
        key: id,
        id,
        label: label.trim(),
        title: label.trim(),
        icon: "✦",
        sub: teaser(persona.trim()),
        ph: `Make your case for “${label.trim()}”. Be specific, concrete, and genuinely convincing…`,
        community: true,
        creator: address,
      });
      onClose();
    } catch (e) {
      setBusy(false);
      const msg = (e as { shortMessage?: string; message?: string }).shortMessage ?? (e as Error).message ?? String(e);
      setStatus("Failed: " + msg);
    }
  }

  return (
    <div className="overlay" onClick={busy ? undefined : onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="spread" style={{ marginBottom: 4 }}>
          <h2 style={{ margin: 0 }}>Create your own examiner</h2>
          <button className="modal-x" onClick={onClose} disabled={busy} aria-label="Close">
            ✕
          </button>
        </div>
        <p className="muted" style={{ marginTop: 6 }}>
          Anyone can register a <span className="commtag">COMMUNITY</span> examiner. You write only the{" "}
          <strong>role</strong> and what counts as merit — the contract always appends the security rules and the
          fixed PASS / REVISE / FAIL output, so you can’t weaken the anti-injection defense.
        </p>

        <div className="field">
          <label>
            Examiner name <span className="faint">(shown on the credential)</span>
          </label>
          <input
            className="input"
            maxLength={MAX_LABEL}
            placeholder="e.g. Pitch to a Venture Capitalist"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <div className="counter mono" style={{ color: labelBytes > MAX_LABEL ? "var(--fail)" : "var(--faint)" }}>
            {labelBytes} / {MAX_LABEL}
          </div>
        </div>

        <div className="field">
          <label>
            Persona — the role &amp; rubric <span className="faint">(no security rules needed)</span>
          </label>
          <textarea
            maxLength={MAX_PERSONA + 200}
            placeholder="You are a venture capitalist hearing a 60-second pitch. Reward a clear problem, a credible wedge, and real traction; be skeptical of vague claims…"
            value={persona}
            onChange={(e) => setPersona(e.target.value)}
            style={{ minHeight: 120 }}
          />
          <div className="counter mono" style={{ color: personaBytes > MAX_PERSONA ? "var(--fail)" : "var(--faint)" }}>
            {personaBytes} / {MAX_PERSONA}
          </div>
        </div>

        <div className="trust" style={{ marginTop: 12 }}>
          Costs a one-time <strong>{feeStr} STT</strong> anti-spam fee + gas. Once registered, the examiner is
          permanent and immutable, and anyone can attempt it.
        </div>

        {status && (
          <div className="muted" style={{ marginTop: 10, fontSize: 13 }}>
            {status}
          </div>
        )}

        <div className="spread" style={{ marginTop: 16 }}>
          <button className="btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={onCreate} disabled={!valid || busy}>
            {busy ? "Registering…" : `Register examiner · ${feeStr} STT`}
          </button>
        </div>
      </div>
    </div>
  );
}
