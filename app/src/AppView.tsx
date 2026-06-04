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

export default function AppView() {
  const [selected, setSelected] = useState<Challenge>(CHALLENGES[0]);
  const [bump, setBump] = useState(0);

  return (
    <>
      <Header />
      <SeasonBanner onChange={() => setBump((b) => b + 1)} />
      <div className="wrap">
        <section className="apphead">
          <span className="eyebrow">The Court is in session</span>
          <h1 className="serif">Submit your argument for judgment.</h1>
          <p className="muted">
            Pick a challenge, write your statement, and an AI examiner running <em>inside</em> Somnia
            validator consensus returns a verdict. A pass mints an unforgeable, soulbound credential.
          </p>
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
          <div className="faint">Somnia Shannon testnet · chain 50312</div>
        </footer>
      </div>
    </>
  );
}
