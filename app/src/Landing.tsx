import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { usePublicClient } from "wagmi";
import { ADDR, judgeAbi, credAbi, CHALLENGES } from "./contracts";
import { EXPLORER } from "./wagmi";
import Docket from "./components/Docket";

const FOCI: [string, string][] = [
  ["EVIDENCE", "concrete proof, data & numbers"],
  ["METHODOLOGY", "sound, rigorous method"],
  ["NOVELTY", "originality & contribution"],
  ["ROLE_FIT", "direct relevance to the role"],
  ["HONESTY", "candor & owned limits"],
  ["OVERALL", "all qualities, balanced"],
];

interface Stats {
  season: number;
  focus: string;
  strictness: number;
  issued: number;
  rate: number;
  verdicts: number;
  seasons: number;
  ready: boolean;
}

function useChainStats(): Stats {
  const client = usePublicClient();
  const [s, setS] = useState<Stats>({
    season: 0,
    focus: "OVERALL",
    strictness: 50,
    issued: 0,
    rate: 0,
    verdicts: 0,
    seasons: 0,
    ready: false,
  });

  useEffect(() => {
    let live = true;
    async function load() {
      if (!client) return;
      try {
        const [se, fo, st, nextId] = await Promise.all([
          client.readContract({ address: ADDR.judge, abi: judgeAbi, functionName: "currentSeason" }),
          client.readContract({ address: ADDR.judge, abi: judgeAbi, functionName: "currentFocus" }),
          client.readContract({ address: ADDR.judge, abi: judgeAbi, functionName: "currentStrictness" }),
          client.readContract({ address: ADDR.credential, abi: credAbi, functionName: "nextId" }),
        ]);
        let rate = 0;
        let verdicts = 0;
        try {
          const latest = await client.getBlockNumber();
          const from = latest > 9000n ? latest - 9000n : 0n;
          const vlogs = await client.getContractEvents({
            address: ADDR.judge,
            abi: judgeAbi,
            eventName: "VerdictReached",
            fromBlock: from,
          });
          let p = 0;
          let t = 0;
          for (const lg of vlogs) {
            const v = Number((lg.args as { verdict?: number }).verdict);
            if (v > 0) {
              t++;
              if (v === 1) p++;
            }
          }
          verdicts = t;
          rate = t ? Math.round((p / t) * 100) : 0;
        } catch {
          /* event window may fail; keep zeros */
        }
        if (!live) return;
        setS({
          season: Number(se),
          focus: (fo as string) || "OVERALL",
          strictness: Number(st),
          issued: Number(nextId),
          rate,
          verdicts,
          seasons: Math.max(0, Number(se) - 1),
          ready: true,
        });
      } catch {
        /* contracts may not be reachable; keep prior */
      }
    }
    load();
    const id = setInterval(load, 8000);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, [client]);

  return s;
}

/** Fetches the most recently minted credential's self-rendered SVG (on-chain tokenURI). */
function useLatestCert(issued: number): string | null {
  const client = usePublicClient();
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    if (!client || issued < 1) {
      setSvg(null);
      return;
    }
    (async () => {
      try {
        const uri = (await client.readContract({
          address: ADDR.credential,
          abi: credAbi,
          functionName: "tokenURI",
          args: [BigInt(issued - 1)],
        })) as string;
        const b64 = uri.split(",")[1];
        const json = JSON.parse(atob(b64)) as { image?: string };
        if (live && json.image) setSvg(json.image);
      } catch {
        if (live) setSvg(null);
      }
    })();
    return () => {
      live = false;
    };
  }, [client, issued]);
  return svg;
}

function useCountUp(target: number, run: boolean): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!run) return;
    let raf = 0;
    const start = performance.now();
    const dur = 900;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run]);
  return n;
}

function useReveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll(".reveal"));
    if (typeof IntersectionObserver === "undefined") {
      els.forEach((e) => e.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);
}

export default function Landing() {
  const stats = useChainStats();
  const cert = useLatestCert(stats.issued);
  useReveal();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const issued = useCountUp(stats.issued, stats.ready);
  const rate = useCountUp(stats.rate, stats.ready);
  const seasonsN = useCountUp(stats.seasons, stats.ready);
  const seasonStr = stats.ready ? `S${stats.season}` : "—";

  return (
    <>
      {/* NAV */}
      <header className={`lnav${scrolled ? " scrolled" : ""}`}>
        <div className="lwrap lnav-in">
          <Link to="/" className="brand" style={{ color: "inherit", textDecoration: "none" }}>
            <div className="seal">V</div>
            <div className="word">VERDICTUM</div>
          </Link>
          <nav className="lnav-links">
            <a className="hideable" href="#moat">
              The moat
            </a>
            <a className="hideable" href="#how">
              How it works
            </a>
            <a className="hideable" href="#docket">
              The Docket
            </a>
            <Link to="/app" className="btn btn-gold">
              Launch app →
            </Link>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="lhero">
        <div className="aurora" />
        <div className="gridfade" />
        <div className="lwrap lhero-in">
          <span className="lbadge">
            <span className={`dot${stats.ready ? " on" : ""}`} />
            {stats.ready
              ? `Live on Somnia · Season ${stats.season} · Court of ${stats.focus}`
              : "On-chain AI examiner · Somnia"}
          </span>
          <h1>
            An AI examiner that <span className="g">can't be bribed</span>. A credential that{" "}
            <span className="g">can't be faked</span>.
          </h1>
          <p className="lhero-sub">
            Verdictum runs its judge <em>inside</em> Somnia's validator consensus — not on a server we
            control. Submit your strongest written case; the chain itself returns the verdict. Pass, and
            it mints a soulbound credential no one, not even us, can forge or revoke.
          </p>
          <div className="lcta-row">
            <Link to="/app" className="btn btn-gold btn-lg">
              Launch the Court →
            </Link>
            <a href="#how" className="btn btn-ghost btn-lg">
              See how it works
            </a>
          </div>

          <div className="lstrip">
            <div>
              <div className="n mono">{issued}</div>
              <div className="l">Credentials issued</div>
            </div>
            <div>
              <div className="n mono">{rate}%</div>
              <div className="l">Pass-rate · {stats.verdicts} verdicts</div>
            </div>
            <div>
              <div className="n mono">
                <span className="gold">{seasonStr}</span>
              </div>
              <div className="l">Current season</div>
            </div>
            <div>
              <div className="n mono">{seasonsN}×</div>
              <div className="l">Seasons self-advanced</div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST BAR */}
      <div className="trustbar">
        <div className="trustbar-in">
          <span>Built on <b>Somnia</b></span>
          <span>On-chain LLM <b>in validator consensus</b></span>
          <span><b>ERC-5192</b> soulbound</span>
          <span>No off-chain oracle, <b>no human in the loop</b></span>
        </div>
      </div>

      {/* MOAT */}
      <section className="lsec" id="moat">
        <div className="lwrap">
          <div className="lsec-head reveal">
            <span className="kicker">Why this needs a blockchain</span>
            <h2>Everyone else moved the trust. We removed it.</h2>
            <p>
              “On-chain AI” usually means a model that ran on someone's private server, with the chain just
              rubber-stamping the result. The trust didn't disappear — it hopped to whoever ran the model.
            </p>
          </div>
          <div className="diptych">
            <div className="dip dip-other reveal">
              <div className="dlabel">Everywhere else</div>
              <h3>The AI runs off-chain.</h3>
              <p>
                A server, an oracle, or a company computes the verdict and posts it. You're not trusting the
                chain — you're trusting whoever held the keys, and hoping they didn't tilt the model. The
                bribe just has a new address.
              </p>
            </div>
            <div className="dip dip-somnia reveal">
              <div className="dlabel">On Somnia</div>
              <h3>The judge runs inside consensus.</h3>
              <p>
                A subcommittee of validators runs the examiner — Qwen3, temperature 0 — and agrees on one
                verdict by majority. The result isn't reported to the chain; reaching it <em>is</em> the
                transaction. There's no one left to bribe.
              </p>
            </div>
          </div>

          <div className="credband reveal">
            <div className="moat-ico">🔒</div>
            <div>
              <h3>And the proof can't be faked, either.</h3>
              <p>
                A pass mints an ERC-5192 soulbound token that renders its own certificate — SVG and metadata,
                entirely on-chain. It can never be transferred and never burned. No issuer database to breach,
                no PDF to forge, no “verify” button that phones home to a company that might not exist next
                year. Irrevocable, self-rendering, and provably yours.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section
        className="lsec"
        id="how"
        style={{ background: "rgba(16,20,28,0.4)", borderTop: "1px solid var(--hairline)", borderBottom: "1px solid var(--hairline)" }}
      >
        <div className="lwrap">
          <div className="lsec-head reveal">
            <span className="kicker">How it works</span>
            <h2>From statement to seal, on one chain.</h2>
            <p>No backend. No human grader. Every step below is a transaction you can inspect.</p>
          </div>
          <div className="flow">
            {[
              {
                n: "1",
                h: "You make your case",
                p: "Pick a challenge and write your statement. It's delimiter-fenced and hardened against prompt-injection before it ever reaches the model.",
                t: "submit()",
              },
              {
                n: "2",
                h: "The court convenes",
                p: "The Judge contract opens an inference request to Somnia's on-chain AI agent — under fixed rules the petitioner can neither see nor override.",
                t: "createRequest()",
              },
              {
                n: "3",
                h: "Validators rule",
                p: "A subcommittee of validators runs the LLM and agrees on a single verdict — PASS, REVISE, or FAIL. Consensus is the ruling.",
                t: "handleResponse()",
              },
              {
                n: "4",
                h: "The seal is struck",
                p: "A PASS mints your soulbound credential on the spot — stamped with the season and the focus it was won under.",
                t: "ERC-5192",
              },
            ].map((s) => (
              <div className="flow-step reveal" key={s.n}>
                <div className="num">{s.n}</div>
                <h4>{s.h}</h4>
                <p>{s.p}</p>
                <span className="tag mono">{s.t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SEASONS */}
      <section className="lsec" id="seasons">
        <div className="lwrap season-wrap">
          <div className="reveal">
            <div className="lsec-head">
              <span className="kicker">Autonomous</span>
              <h2>An agent that acts — not just answers.</h2>
              <p style={{ margin: "14px 0 0" }}>
                Most “AI agents” wait to be asked. Verdictum's Governor runs the court by itself. On a fixed
                cadence it opens a new exam season and uses the on-chain LLM to choose what this season
                scrutinises and how hard. No human sets the bar — and the same application that passed last
                season can fail the next.
              </p>
            </div>
            <div className="focus-chips">
              {FOCI.map(([k, d]) => (
                <span className="fchip" key={k}>
                  <b>{k}</b> — {d}
                </span>
              ))}
            </div>
          </div>
          <div className="season-panel reveal">
            <div className="seal">{seasonStr}</div>
            <div className="ttl serif">
              The Court of <span style={{ color: "var(--gold)" }}>{stats.ready ? stats.focus : "—"}</span>
            </div>
            <div className="muted" style={{ fontSize: 13 }}>
              chosen by the AI, no human
            </div>
            <div className="pill" style={{ marginTop: 16, borderColor: "var(--hairline)" }} title="this season's gate">
              <span className="dot on" /> gate {stats.strictness}/100 · set autonomously
            </div>
          </div>
        </div>
      </section>

      {/* THE CREDENTIAL */}
      <section
        className="lsec"
        style={{ background: "rgba(16,20,28,0.4)", borderTop: "1px solid var(--hairline)", borderBottom: "1px solid var(--hairline)" }}
      >
        <div className="lwrap credspot">
          <div className="reveal">
            {cert ? (
              <div className="cred">
                <div className="cred-inner">
                  <img src={cert} alt="On-chain self-rendering credential" />
                </div>
              </div>
            ) : (
              <div className="credframe-empty">
                Your certificate renders itself, entirely on-chain.
                <br />
                Win one to mint the first.
              </div>
            )}
          </div>
          <div className="reveal">
            <span className="kicker">The reward</span>
            <h2 style={{ fontFamily: "Fraunces", fontWeight: 600, fontSize: "clamp(26px,3.6vw,38px)", margin: "12px 0 0", lineHeight: 1.1 }}>
              A certificate no one can sell, fake, or take back.
            </h2>
            <ul>
              <li>Self-rendering on-chain SVG — the image above is drawn by the contract, not hosted anywhere.</li>
              <li>ERC-5192 soulbound — non-transferable, and burn-blocked, so it's permanent and bound to you.</li>
              <li>Stamped with the season and focus it was won under — context that can never be edited.</li>
              <li>Verifiable by anyone, forever, with nothing but the chain.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* CHALLENGES */}
      <section className="lsec">
        <div className="lwrap">
          <div className="lsec-head reveal">
            <span className="kicker">The challenges</span>
            <h2>Three courts. One that can't be charmed.</h2>
            <p>Every high-stakes written gate is the same shape: a stranger reads your words and decides.</p>
          </div>
          <div className="lchal">
            {CHALLENGES.map((c) => (
              <div className={`tile reveal${c.featured ? " sel" : ""}`} key={c.key}>
                <div className="ico">{c.icon}</div>
                <h3 style={{ marginTop: 12 }}>
                  {c.title}
                  {c.free && <span className="freetag">FREE</span>}
                </h3>
                <p>{c.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LIVE DOCKET */}
      <section
        className="lsec"
        id="docket"
        style={{ background: "rgba(16,20,28,0.4)", borderTop: "1px solid var(--hairline)", borderBottom: "1px solid var(--hairline)" }}
      >
        <div className="lwrap">
          <div className="lsec-head reveal">
            <span className="kicker">Live · on-chain</span>
            <h2>The Docket. Written by the chain, not by us.</h2>
            <p>Every verdict and every autonomous ruling below is pulled live from Somnia right now.</p>
          </div>
          <div className="reveal">
            <Docket />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="lsec">
        <div className="lwrap">
          <div className="lsec-head reveal">
            <span className="kicker">FAQ</span>
            <h2>The obvious questions.</h2>
          </div>
          <div className="faq reveal">
            <details open>
              <summary>Is the AI really running on-chain?</summary>
              <p>
                Yes. The verdict is produced by Somnia's native AI agent — a Qwen3 model executed by a
                subcommittee of validators at temperature 0 and agreed by majority consensus. There is no
                off-chain oracle reporting a result; the inference happens as part of consensus itself.
              </p>
            </details>
            <details>
              <summary>Isn't this just AI off-chain with extra steps?</summary>
              <p>
                That's exactly the thing it isn't. Off-chain AI means trusting whoever ran the model.
                Here the validators recompute and agree on the verdict, so there's no single party who can
                quietly tilt the result — and if consensus can't be reached, it fails safe.
              </p>
            </details>
            <details>
              <summary>What does it cost me?</summary>
              <p>
                Reading the Docket and verifying a credential is free. Submitting a statement costs a small
                inference deposit in testnet STT plus gas. The “Defend Yourself From Mom” court is free to try.
              </p>
            </details>
            <details>
              <summary>Can a credential be revoked or transferred?</summary>
              <p>
                No. Credentials are ERC-5192 soulbound tokens: non-transferable by standard, and Verdictum
                also blocks burning — so once the chain has ruled in your favour, the proof is permanent and
                bound to you. Not even we can take it back.
              </p>
            </details>
            <details>
              <summary>What stops someone from prompt-injecting the judge?</summary>
              <p>
                Every statement is byte-validated, wrapped in unforgeable delimiters, and sandwiched between
                fixed rules the submitter can't see or escape — re-asserted after the input. We ran a jailbreak
                gauntlet against it and closed every leak we found.
              </p>
            </details>
            <details>
              <summary>Which chain and network?</summary>
              <p>
                Somnia Shannon testnet (chain 50312). Contract addresses are in the footer — every claim on
                this page is verifiable on the explorer.
              </p>
            </details>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="lsec">
        <div className="lwrap">
          <div className="lcta-band reveal">
            <div className="aurora" style={{ height: "100%", inset: 0, opacity: 0.6 }} />
            <div style={{ position: "relative", zIndex: 1 }}>
              <h2 className="serif">Make your case. Let the chain decide.</h2>
              <p>Step into the court, write your statement, and argue your worth to a judge that answers to no one. A pass is yours forever.</p>
              <Link to="/app" className="btn btn-gold btn-lg">
                Launch the Court →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="lfoot">
        <div className="lwrap lfoot-grid">
          <div>
            <div className="brand" style={{ marginBottom: 10 }}>
              <div className="seal">V</div>
              <div className="word">VERDICTUM</div>
            </div>
            <div className="muted" style={{ fontSize: 13, maxWidth: 280 }}>
              The verdict isn't advice — it's the transaction. Built for the Somnia Agentathon.
            </div>
          </div>
          <div>
            <div className="eyebrow" style={{ marginBottom: 10 }}>
              On-chain · Somnia Shannon · 50312
            </div>
            <div className="addrgrid mono">
              {(
                [
                  ["Judge", ADDR.judge],
                  ["Credential", ADDR.credential],
                  ["Inspector", ADDR.inspector],
                ] as const
              ).map(([k, v]) => (
                <div key={k} style={{ display: "contents" }}>
                  <div className="faint">{k}</div>
                  <div>
                    <a target="_blank" rel="noreferrer" href={`${EXPLORER}/address/${v}`}>
                      {v}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
