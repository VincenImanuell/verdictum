import { CHALLENGES, type Challenge } from "../contracts";

export default function ChallengePicker({
  selected,
  onSelect,
}: {
  selected: Challenge;
  onSelect: (c: Challenge) => void;
}) {
  return (
    <section className="section">
      <h2>Choose your examination</h2>
      <p className="muted">
        One contract, many examiners. Job Application Screening is the flagship; the others share the same consensus-validated judge.
      </p>
      <div className="tiles">
        {CHALLENGES.map((c) => {
          const cls = `tile${c.featured ? " featured" : ""}${c.key === selected.key ? " sel" : ""}`;
          return (
            <button key={c.key} className={cls} onClick={() => onSelect(c)}>
              <div className="top-accent" />
              {c.featured && <div className="ribbon">FLAGSHIP</div>}
              <div className="ico">{c.icon}</div>
              <div>
                <h3>
                  {c.title}
                  {c.free && <span className="freetag">FREE</span>}
                </h3>
                <p>{c.sub}</p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
