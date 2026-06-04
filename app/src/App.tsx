import { useState } from "react";
import { CHALLENGES, type Challenge, ADDR } from "./contracts";
import { EXPLORER } from "./wagmi";
import Header from "./components/Header";
import SeasonBanner from "./components/SeasonBanner";
import ChallengePicker from "./components/ChallengePicker";
import SubmitPanel from "./components/SubmitPanel";
import InspectorPanel from "./components/InspectorPanel";
import Docket from "./components/Docket";
import VerifyPanel from "./components/VerifyPanel";

export default function App() {
  const [selected, setSelected] = useState<Challenge>(CHALLENGES[0]);
  const [bump, setBump] = useState(0);

  return (
    <>
      <Header />
      <SeasonBanner onChange={() => setBump((b) => b + 1)} />
      <div className="wrap">
        <section className="hero">
          <h1>
            An AI judge that lives inside <span className="em">validator consensus</span>.
          </h1>
          <p>
            A consensus-validated AI examiner and an unforgeable, soulbound credential for any high-stakes written argument. No server scored you. No company stamped your certificate. The chain did — and no one, not even us, can fake or revoke it.
          </p>
          <div className="moat">
            <span className="pill">⚖ Judged in consensus, not by an off-chain oracle</span>
            <span className="pill">🔒 Soulbound · ERC-5192</span>
            <span className="pill">🤖 Autonomous strictness</span>
          </div>
        </section>

        <ChallengePicker selected={selected} onSelect={setSelected} />
        <SubmitPanel challenge={selected} />
        <InspectorPanel />
        <Docket refreshKey={bump} />
        <VerifyPanel />

        <footer>
          <strong className="serif">VERDICTUM</strong> · built for the Somnia Agentathon
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
                  <a target="_blank" href={`${EXPLORER}/address/${v}`}>
                    {v}
                  </a>
                </div>
              </div>
            ))}
          </div>
          <div className="faint">
            Somnia Shannon testnet · chain 50312 · dev: npm run dev
          </div>
        </footer>
      </div>
    </>
  );
}
