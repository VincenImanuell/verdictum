import { useState } from "react";
import { useLang } from "./i18n";
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
  const { t } = useLang();
  const [selected, setSelected] = useState<Challenge>(CHALLENGES[0]);
  const [bump, setBump] = useState(0);

  return (
    <>
      <Header />
      <SeasonBanner onChange={() => setBump((b) => b + 1)} />
      <div className="wrap">
        <section className="hero">
          <h1>
            {t("An AI judge that lives inside ", "Hakim AI yang hidup di dalam ")}
            <span className="em">{t("validator consensus", "konsensus validator")}</span>.
          </h1>
          <p>
            {t(
              "A consensus-validated AI examiner and an unforgeable, soulbound credential for any high-stakes written argument. No server scored you. No company stamped your certificate. The chain did — and no one, not even us, can fake or revoke it.",
              "Examiner AI yang divalidasi konsensus dan kredensial soulbound yang tak bisa dipalsu untuk argumen tertulis bertaruhan tinggi apa pun. Tak ada server yang menilaimu. Tak ada perusahaan yang menstempel sertifikatmu. Chain yang menilai — dan tak seorang pun, termasuk kami, bisa memalsukan atau mencabutnya.",
            )}
          </p>
          <div className="moat">
            <span className="pill">⚖ {t("Judged in consensus, not by an off-chain oracle", "Dinilai dalam konsensus, bukan oracle off-chain")}</span>
            <span className="pill">🔒 {t("Soulbound · ERC-5192", "Soulbound · ERC-5192")}</span>
            <span className="pill">🤖 {t("Autonomous strictness", "Strictness otonom")}</span>
          </div>
        </section>

        <ChallengePicker selected={selected} onSelect={setSelected} />
        <SubmitPanel challenge={selected} />
        <InspectorPanel />
        <Docket refreshKey={bump} />
        <VerifyPanel />

        <footer>
          <strong className="serif">VERDICTUM</strong> · {t("built for the Somnia Agentathon", "dibangun untuk Somnia Agentathon")}
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
            {t(
              "Somnia Shannon testnet · chain 50312 · dev: npm run dev",
              "Somnia Shannon testnet · chain 50312 · dev: npm run dev",
            )}
          </div>
        </footer>
      </div>
    </>
  );
}
