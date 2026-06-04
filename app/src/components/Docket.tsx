import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { ADDR, judgeAbi, inspAbi, credAbi } from "../contracts";
import { useLang } from "../i18n";

interface VRow {
  v: number;
  season: number;
  focus: string;
  petitioner: string;
}
interface Ruling {
  kind: "season" | "strict";
  text: string;
}

const VLABEL: Record<number, { w: string; c: string }> = {
  1: { w: "PASS", c: "var(--pass)" },
  2: { w: "REVISE", c: "var(--amber)" },
  3: { w: "FAIL", c: "var(--fail)" },
  0: { w: "—", c: "var(--faint)" },
};
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export default function Docket({ refreshKey }: { refreshKey?: number }) {
  const { t, lang } = useLang();
  const client = usePublicClient();
  const [total, setTotal] = useState(0);
  const [strictness, setStrictness] = useState(50);
  const [seasons, setSeasons] = useState(0);
  const [vc, setVc] = useState({ p: 0, r: 0, f: 0 });
  const [feed, setFeed] = useState<VRow[]>([]);
  const [rulings, setRulings] = useState<Ruling[]>([]);

  async function load() {
    if (!client) return;
    try {
      const [nextId, st, se] = await Promise.all([
        client.readContract({ address: ADDR.credential, abi: credAbi, functionName: "nextId" }),
        client.readContract({ address: ADDR.judge, abi: judgeAbi, functionName: "currentStrictness" }),
        client.readContract({ address: ADDR.judge, abi: judgeAbi, functionName: "currentSeason" }),
      ]);
      setTotal(Number(nextId));
      setStrictness(Number(st));
      setSeasons(Math.max(0, Number(se) - 1));
    } catch {
      /* contracts may not be wired yet */
    }
    try {
      const latest = await client.getBlockNumber();
      const from = latest > 9000n ? latest - 9000n : 0n;
      const [vlogs, slogs, ulogs] = await Promise.all([
        client.getContractEvents({ address: ADDR.judge, abi: judgeAbi, eventName: "VerdictReached", fromBlock: from }),
        client.getContractEvents({ address: ADDR.inspector, abi: inspAbi, eventName: "SeasonAdvanced", fromBlock: from }),
        client.getContractEvents({ address: ADDR.inspector, abi: inspAbi, eventName: "StrictnessUpdated", fromBlock: from }),
      ]);
      let p = 0,
        r = 0,
        f = 0;
      const rows: VRow[] = [];
      for (const lg of vlogs) {
        const a = lg.args as { verdict?: number; season?: number; focus?: string; petitioner?: string };
        const v = Number(a.verdict);
        if (v === 1) p++;
        else if (v === 2) r++;
        else if (v === 3) f++;
        if (v > 0) rows.push({ v, season: Number(a.season ?? 0), focus: a.focus ?? "", petitioner: a.petitioner ?? "" });
      }
      setVc({ p, r, f });
      setFeed(rows.slice(-8).reverse());
      const rl: Ruling[] = [];
      for (const lg of slogs) {
        const a = lg.args as { season?: number; newFocus?: string };
        rl.push({ kind: "season", text: `${t("Season", "Musim")} ${Number(a.season ?? 0)} — focus ${a.newFocus ?? ""}` });
      }
      for (const lg of ulogs) {
        const a = lg.args as { oldStrictness?: number; newStrictness?: number };
        rl.push({ kind: "strict", text: `${t("Strictness", "Strictness")} ${Number(a.oldStrictness ?? 0)} → ${Number(a.newStrictness ?? 0)}` });
      }
      setRulings(rl.slice(-8).reverse());
    } catch {
      /* event window query failed; keep prior */
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 6000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, refreshKey, lang]);

  const totalV = vc.p + vc.r + vc.f;
  const rate = totalV ? Math.round((vc.p / totalV) * 100) : 0;
  const pct = (n: number) => (totalV ? (n / totalV) * 100 : 0);

  return (
    <section className="section card">
      <h2>{t("The Docket — the world keeps score", "Docket — dunia mencatat sendiri")}</h2>
      <p className="muted" style={{ fontSize: 13, margin: "4px 0 14px" }}>
        {t("Every line below was written by the chain, not by us.", "Tiap baris di bawah ditulis oleh chain, bukan oleh kami.")}
      </p>

      <div className="stats">
        <div className="stat">
          <div className="statlabel">{t("Credentials issued", "Kredensial terbit")}</div>
          <div className="statnum mono">{total}</div>
        </div>
        <div className="stat">
          <div className="statlabel">{t("Pass-rate", "Tingkat lulus")}</div>
          <div className="statnum mono">{rate}%</div>
          <div className="minibar" style={{ width: "100%", height: 6, marginTop: 6 }}>
            <div style={{ display: "flex", height: "100%" }}>
              <i style={{ width: `${pct(vc.p)}%`, background: "var(--pass)" }} />
              <i style={{ width: `${pct(vc.r)}%`, background: "var(--amber)" }} />
              <i style={{ width: `${pct(vc.f)}%`, background: "var(--fail)" }} />
            </div>
          </div>
          <div className="faint" style={{ fontSize: 11, marginTop: 4 }}>
            {totalV} {t("verdicts", "vonis")}
          </div>
        </div>
        <div className="stat">
          <div className="statlabel">{t("Current strictness", "Strictness kini")}</div>
          <div className="statnum mono">{strictness}/100</div>
        </div>
        <div className="stat">
          <div className="statlabel">{t("Seasons advanced", "Musim berganti")}</div>
          <div className="statnum mono">{seasons}×</div>
          <div className="faint" style={{ fontSize: 11, marginTop: 4 }}>{t("autonomously", "otonom")}</div>
        </div>
      </div>

      <div className="docketcols">
        <div>
          <div className="eyebrow" style={{ marginBottom: 8 }}>{t("Latest rulings", "Vonis terbaru")}</div>
          {feed.length === 0 && <div className="faint" style={{ fontSize: 12.5 }}>{t("no verdicts in range yet", "belum ada vonis di rentang ini")}</div>}
          {feed.map((row, i) => (
            <div key={i} className="docrow">
              <span className="vtag" style={{ color: VLABEL[row.v]?.c, borderColor: VLABEL[row.v]?.c }}>{VLABEL[row.v]?.w}</span>
              <span className="mono faint">{short(row.petitioner)}</span>
              <span className="faint" style={{ marginLeft: "auto", fontSize: 11.5 }}>S{row.season} · {row.focus}</span>
            </div>
          ))}
        </div>
        <div>
          <div className="eyebrow" style={{ marginBottom: 8 }}>{t("Autonomous rulings", "Putusan otonom")}</div>
          {rulings.length === 0 && <div className="faint" style={{ fontSize: 12.5 }}>{t("the board has not yet acted in range", "dewan belum bertindak di rentang ini")}</div>}
          {rulings.map((rl, i) => (
            <div key={i} className="docrow">
              <span style={{ color: rl.kind === "season" ? "var(--gold)" : "var(--lapis)" }}>{rl.kind === "season" ? "⚖" : "▲"}</span>
              <span style={{ fontSize: 12.8 }}>{rl.text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
