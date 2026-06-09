import { CHALLENGES } from "../contracts";
import { useAppDispatch, useAppSelector } from "../hooks";
import { selectChallenge, selectSelectedKey } from "../uiSlice";

export default function ChallengePicker() {
  const selectedKey = useAppSelector(selectSelectedKey);
  const dispatch = useAppDispatch();

  return (
    <section className="section">
      <h2>Choose your examination</h2>
      <p className="muted">
        One contract, many examiners. Job Application Screening is the flagship; the others share the same consensus-validated judge.
      </p>
      <div className="tiles">
        {CHALLENGES.map((c) => {
          const cls = `tile${c.featured ? " featured" : ""}${c.key === selectedKey ? " sel" : ""}`;
          return (
            <button key={c.key} className={cls} onClick={() => dispatch(selectChallenge(c.key))}>
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
