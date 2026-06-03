import { CHALLENGES, type Challenge } from "../contracts";
import { useLang } from "../i18n";

export default function ChallengePicker({
  selected,
  onSelect,
}: {
  selected: Challenge;
  onSelect: (c: Challenge) => void;
}) {
  const { lang, t } = useLang();
  return (
    <section className="section">
      <h2>{t("Choose your examination", "Pilih ujianmu")}</h2>
      <p className="muted">
        {t(
          "One contract, many examiners. Job Application Screening is the flagship; the others share the same consensus-validated judge.",
          "Satu kontrak, banyak penguji. Job Application Screening adalah unggulan; yang lain memakai hakim ber-konsensus yang sama.",
        )}
      </p>
      <div className="tiles">
        {CHALLENGES.map((c) => {
          const L = lang === "en" ? c.en : c.id_;
          const cls = `tile${c.featured ? " featured" : ""}${c.key === selected.key ? " sel" : ""}`;
          return (
            <button key={c.key} className={cls} onClick={() => onSelect(c)}>
              <div className="top-accent" />
              {c.featured && <div className="ribbon">FLAGSHIP</div>}
              <div className="ico">{c.icon}</div>
              <div>
                <h3>
                  {L.title}
                  {c.free && <span className="freetag">FREE</span>}
                </h3>
                <p>{L.sub}</p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
