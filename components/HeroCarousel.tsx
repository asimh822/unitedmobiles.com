"use client";

import { Children, useCallback, useEffect, useRef, useState } from "react";

const AUTOPLAY_MS = 5000;

/**
 * Banner carousel: the trust panel first, then promo slides. Same scroll-snap
 * mechanism as BrandCarousel (native swipe, no touch handlers) but one slide
 * per view, with autoplay, dots and wrap-around arrows.
 *
 * Children are server-rendered — the slides stay in the initial HTML so the
 * first one paints without waiting for hydration.
 */
export default function HeroCarousel({ children }: { children: React.ReactNode }) {
  const scroller = useRef<HTMLDivElement>(null);
  const slides = Children.toArray(children);
  const count = slides.length;
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const goTo = useCallback(
    (i: number) => {
      const el = scroller.current;
      if (!el) return;
      const next = ((i % count) + count) % count;
      // Set the index up front rather than waiting for the scroll to land:
      // a smooth scroll fires many intermediate events, and rounding those
      // would bounce the index back and forth mid-animation.
      setActive(next);
      el.scrollTo({ left: next * el.clientWidth, behavior: reduced ? "auto" : "smooth" });
    },
    [count, reduced],
  );

  // Autoplay. Skipped entirely for reduced motion, and paused while the user is
  // interacting or the tab is in the background.
  useEffect(() => {
    if (reduced || paused || count < 2) return;
    const id = setInterval(() => goTo(active + 1), AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [active, paused, reduced, count, goTo]);

  useEffect(() => {
    const onVisibility = () => setPaused(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // Touch has no "leave" event, so a single tap would otherwise pause autoplay
  // for good. Hold it while the finger is down, then hand control back.
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function holdThenResume() {
    setPaused(true);
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => setPaused(false), 8000);
  }
  useEffect(() => () => { if (resumeTimer.current) clearTimeout(resumeTimer.current); }, []);

  // Keeps the dots honest when the user swipes or drags. Only accepts a
  // position that has actually settled on a slide, so it never fights goTo's
  // in-flight animation.
  function onScroll() {
    const el = scroller.current;
    if (!el || !el.clientWidth) return;
    const exact = el.scrollLeft / el.clientWidth;
    const nearest = Math.round(exact);
    if (Math.abs(exact - nearest) < 0.02) setActive(nearest);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight") { e.preventDefault(); goTo(active + 1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); goTo(active - 1); }
  }

  const arrowClass =
    "absolute top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-white/40 bg-white/85 text-xl font-bold text-brand shadow-md transition hover:bg-white sm:grid";

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured"
      className="space-y-1.5"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onTouchStart={holdThenResume}
    >
      {/* The arrows are anchored to the card only, so the dots row below does
          not drag their vertical centre off the banner. */}
      <div className="relative">
        <div
          ref={scroller}
          onScroll={onScroll}
          onKeyDown={onKeyDown}
          tabIndex={0}
          className="flex snap-x snap-mandatory overflow-x-auto rounded-3xl [scrollbar-width:none] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand [&::-webkit-scrollbar]:hidden"
        >
          {slides.map((child, i) => (
            <div
              key={i}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}`}
              // inert, not aria-hidden: these slides hold links, and hiding a
              // focusable element from assistive tech while leaving it tabbable
              // is worse than not hiding it. inert does both.
              inert={i !== active}
              // grid + h-full makes every slide match the tallest one, so the
              // dots stay on the banner instead of stranded below a short slide.
              className="grid w-full shrink-0 snap-start [&>*]:h-full"
            >
              {child}
            </div>
          ))}
        </div>

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => goTo(active - 1)}
              aria-label="Previous slide"
              className={`${arrowClass} left-3`}
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => goTo(active + 1)}
              aria-label="Next slide"
              className={`${arrowClass} right-3`}
            >
              ›
            </button>
          </>
        )}
      </div>

      {/* Below the card, not over it: the promo slides carry a full-width price
          bar along their bottom edge, which dots would otherwise sit on top of. */}
      {count > 1 && (
        <div className="flex justify-center gap-1">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Go to slide ${i + 1} of ${count}`}
              aria-current={i === active}
              className="grid h-5 w-6 place-items-center"
            >
              <span
                className={`block h-1.5 rounded-full transition-all ${
                  i === active ? "w-5 bg-brand" : "w-1.5 bg-stone-300"
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
