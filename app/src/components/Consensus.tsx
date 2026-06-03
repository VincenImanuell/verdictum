import type { ReactNode } from "react";

/** The "awaiting validator consensus" visual — a subcommittee ring with a travelling pulse. */
export default function Consensus({ children }: { children?: ReactNode }) {
  return (
    <div className="consensus">
      <div className="ring">
        <div className="core" />
        <div className="node n1" />
        <div className="node n2" />
        <div className="node n3" />
      </div>
      <div className="steps">{children}</div>
      <div className="hairsweep" />
    </div>
  );
}
