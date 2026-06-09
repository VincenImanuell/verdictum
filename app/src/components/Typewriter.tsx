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

  // Reveal `count` characters across the segments, keeping each run's class.
  let remaining = count;
  return (
    <span className={className} aria-label={full}>
      {segments.map((s, idx) => {
        const shown = Math.max(0, Math.min(s.text.length, remaining));
        remaining -= s.text.length;
        const slice = s.text.slice(0, shown);
        if (!slice) return null;
        return (
          <span key={idx} className={s.cls} aria-hidden="true">
            {slice}
          </span>
        );
      })}
      <span className="tw-caret" aria-hidden="true" />
    </span>
  );
}
