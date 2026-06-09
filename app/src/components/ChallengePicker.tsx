import { useState } from "react";
import { CHALLENGES, type Challenge } from "../contracts";
import { useAppDispatch, useAppSelector } from "../hooks";
import { addCommunity, selectChallenge, selectCommunity, selectSelectedKey } from "../uiSlice";
import { useCommunityChallenges } from "../useCommunityChallenges";
import CreateChallengeModal from "./CreateChallengeModal";

const short = (a?: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "");

export default function ChallengePicker() {
  const selectedKey = useAppSelector(selectSelectedKey);
  const community = useAppSelector(selectCommunity);
  const dispatch = useAppDispatch();
  const { refetch } = useCommunityChallenges();
  const [creating, setCreating] = useState(false);

  function tile(c: Challenge) {
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
            {c.community && <span className="commtag">COMMUNITY</span>}
          </h3>
          <p>{c.sub}</p>
          {c.community && c.creator && <div className="byline mono">by {short(c.creator)}</div>}
        </div>
      </button>
    );
  }

  function handleCreated(c: Challenge) {
    dispatch(addCommunity(c)); // optimistic, so it's selectable immediately
    dispatch(selectChallenge(c.key));
    refetch(); // reconcile with chain
  }

  return (
    <section className="section">
      <h2>Choose your examination</h2>
      <p className="muted">
        One contract, many examiners. Job Application Screening is the flagship; the others share the same
        consensus-validated judge — or spin up your own.
      </p>
      <div className="tiles">
        {CHALLENGES.map(tile)}
        {community.map(tile)}
        <button className="tile create" onClick={() => setCreating(true)}>
          <div className="ico">＋</div>
          <div>
            <h3>Create your own examiner</h3>
            <p>Write a role &amp; rubric, register it on-chain, and let anyone face it.</p>
          </div>
        </button>
      </div>

      {creating && <CreateChallengeModal onClose={() => setCreating(false)} onCreated={handleCreated} />}
    </section>
  );
}
