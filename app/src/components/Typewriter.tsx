import { useEffect, useMemo, useState } from "react";

export interface TypeSeg {
  text: string;
  cls?: string; // optional class for this run (e.g. the gold "g" gradient)
}

const prefersReduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * Types `segments` out character-by-character, preserving each run's styling
 * (so the gold gradient spans keep their class), with a blinking caret.
 *
 * Layout trick: a hidden copy of the FULL text sits in normal flow and reserves the
 * final height up front, while the animated text is overlaid on top (absolute). So the
 * headline never reflows line-by-line while typing — no jank for siblings, and the gap
 * below the headline matches the gap above (no over-reserved space).
 *
 * Honors prefers-reduced-motion by showing the full text instantly.
 */
export default function Typewriter({
  segments,
  speed = 30,
  startDelay = 650,
  className,
}: {
  segments: TypeSeg[];
  speed?: number; // ms per character
  startDelay?: number; // ms before typing begins
  className?: string;
}) {
  const full = useMemo(() => segments.map((s) => s.text).join(""), [segments]);
  const total = full.length;
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (prefersReduced()) {
      setCount(total);
      return;
    }
    setCount(0);
    let i = 0;
    let id = window.setTimeout(function tick() {
      i += 1;
      setCount(i);
      if (i < total) id = window.setTimeout(tick, speed);
    }, startDelay);
    return () => window.clearTimeout(id);
  }, [total, speed, startDelay]);

  // Reveal `n` characters across the segments, keeping each run's class.
  const slices = (n: number) => {
    let remaining = n;
    return segments.map((s, idx) => {
      const shown = Math.max(0, Math.min(s.text.length, remaining));
      remaining -= s.text.length;
      const slice = s.text.slice(0, shown);
      if (!slice) return null;
      return (
        <span key={idx} className={s.cls}>
          {slice}
        </span>
      );
    });
  };

  return (
    <span className={className} aria-label={full} style={{ position: "relative", display: "block" }}>
      {/* hidden full text — reserves the exact final height so nothing reflows while typing */}
      <span aria-hidden="true" style={{ visibility: "hidden" }}>
        {segments.map((s, idx) => (
          <span key={idx} className={s.cls}>
            {s.text}
          </span>
        ))}
      </span>
      {/* visible animated text, overlaid exactly on the reserved box */}
      <span aria-hidden="true" style={{ position: "absolute", left: 0, top: 0, right: 0 }}>
        {slices(count)}
        <span className="tw-caret" />
      </span>
    </span>
  );
}
