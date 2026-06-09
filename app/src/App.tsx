import { useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Lenis from "lenis";
import Landing from "./Landing";
import AppView from "./AppView";

/**
 * Walrus-style inertial smooth scrolling — but ONLY on the landing page.
 * The dapp view (/app) re-renders every second (live countdown, Docket, wagmi polling);
 * Lenis's RAF loop competes with those renders and stutters. Native scroll there is
 * buttery and immune to re-render jank. Anchor links + per-route scroll reset included.
 */
function useSmoothScroll() {
  const { pathname } = useLocation();

  useEffect(() => {
    // /app and reduced-motion → native scroll, just reset to top on entry.
    if (pathname !== "/" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      window.scrollTo(0, 0);
      return;
    }

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    lenis.scrollTo(0, { immediate: true });

    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest('a[href^="#"]') as HTMLAnchorElement | null;
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href || href === "#") return;
      const el = document.querySelector(href);
      if (!el) return;
      e.preventDefault();
      lenis.scrollTo(el as HTMLElement, { offset: -84 });
    };
    document.addEventListener("click", onClick);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("click", onClick);
      lenis.destroy();
    };
  }, [pathname]);
}

export default function App() {
  useSmoothScroll();
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/app" element={<AppView />} />
    </Routes>
  );
}
