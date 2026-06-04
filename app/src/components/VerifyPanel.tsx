import { useState } from "react";
import { usePublicClient } from "wagmi";
import { ADDR, credAbi } from "../contracts";
import { EXPLORER } from "../wagmi";

interface Receipt {
  img: string;
  challenge: string;
  issuedAt: bigint;
  strictness: number;
  holder: string;
  season: number;
  focus: string;
  locked: boolean;
}

export default function VerifyPanel() {
  const client = usePublicClient();
  const [id, setId] = useState("1");
  const [state, setState] = useState<"idle" | "loading" | "ok" | "no">("idle");
  const [data, setData] = useState<Receipt | null>(null);

  async function verify() {
    if (!client) return;
    setState("loading");
    setData(null);
    try {
      const tid = BigInt(id);
      const [m, locked, uri] = await Promise.all([
        client.readContract({ address: ADDR.credential, abi: credAbi, functionName: "credentialOf", args: [tid] }),
        client.readContract({ address: ADDR.credential, abi: credAbi, functionName: "locked", args: [tid] }),
        client.readContract({ address: ADDR.credential, abi: credAbi, functionName: "tokenURI", args: [tid] }),
      ]);
      const json = JSON.parse(atob((uri as string).split(",")[1]));
      setData({
        img: json.image,
        challenge: m[0],
        issuedAt: m[1],
        strictness: Number(m[2]),
        holder: m[3],
        season: Number(m[4]),
        focus: m[5],
        locked,
      });
      setState("ok");
    } catch {
      setState("no");
    }
  }

  const issued = data ? new Date(Number(data.issuedAt) * 1000).toISOString().replace("T", " ").slice(0, 16) + " UTC" : "";

  return (
    <section className="section card">
      <h2>Verify a credential — public, no wallet</h2>
      <p className="muted" style={{ fontSize: 13, margin: "4px 0 12px" }}>
        An on-chain fact: unforgeable and irrevocable by anyone, including the platform's own creators. Read straight from the chain.
      </p>
      <div className="row">
        <input className="input mono" value={id} onChange={(e) => setId(e.target.value)} placeholder="token id" />
        <button className="btn btn-primary" onClick={verify}>
          Verify
        </button>
      </div>

      {state === "loading" && <div className="receipt muted">Reading the chain…</div>}
      {state === "no" && (
        <div className="receipt">
          <div className="valid no">✗ Not found — no credential with that id</div>
        </div>
      )}
      {state === "ok" && data && (
        <div className="receipt">
          <div className="valid ok">✓ VALID — on-chain credential</div>
          <img src={data.img} style={{ width: "100%", borderRadius: 10, margin: "12px 0", border: "1px solid var(--hairline)" }} />
          <div className="kv">
            <div className="k">Challenge</div>
            <div className="v">{data.challenge}</div>
            <div className="k">Strictness</div>
            <div className="v mono">{data.strictness}/100</div>
            <div className="k">Season · Focus</div>
            <div className="v mono">
              S{data.season} · {data.focus}
            </div>
            <div className="k">Issued</div>
            <div className="v mono">{issued}</div>
            <div className="k">Holder</div>
            <div className="v mono">
              <a target="_blank" href={`${EXPLORER}/address/${data.holder}`}>
                {data.holder.slice(0, 8)}…{data.holder.slice(-6)}
              </a>
            </div>
            <div className="k">Soulbound</div>
            <div className="v">{data.locked ? "yes 🔒" : "no"}</div>
          </div>
        </div>
      )}
    </section>
  );
}
