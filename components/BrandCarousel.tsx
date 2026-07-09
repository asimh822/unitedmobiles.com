"use client";

import { Children, useEffect, useRef, useState } from "react";

interface Props {
  /** Brand accent color for the arrow buttons. */
  color: string;
  /** Server-rendered product cards. */
  children: React.ReactNode;
}

/**
 * Single-row horizontal scroller: 8 cards visible on desktop, ‹ › buttons
 * page through the rest (they scroll — no network fetch needed since the row
 * is already loaded). Buttons appear only when there is somewhere to go.
 */
export default function BrandCarousel({ color, children }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  function updateArrows() {
    const el = scroller.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }

  useEffect(() => {
    updateArrows();
    const onResize = () => updateArrows();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  function page(dir: 1 | -1) {
    const el = scroller.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth, behavior: "smooth" });
  }

  const arrowClass =
    "absolute top-1/2 z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full border border-stone-200 bg-white/95 text-lg font-bold shadow-md transition-opacity hover:bg-white";

  return (
    <div className="relative min-w-0 flex-1">
      <div
        ref={scroller}
        onScroll={updateArrows}
        className="flex snap-x gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {Children.map(children, (child) => (
          <div className="w-[31%] shrink-0 snap-start sm:w-[19%] lg:w-[calc((100%-7*0.375rem)/8)]">
            {child}
          </div>
        ))}
      </div>
      {canLeft && (
        <button type="button" onClick={() => page(-1)} aria-label="Previous models" className={`${arrowClass} left-1`} style={{ color }}>
          ‹
        </button>
      )}
      {canRight && (
        <button type="button" onClick={() => page(1)} aria-label="More models" className={`${arrowClass} right-1`} style={{ color }}>
          ›
        </button>
      )}
    </div>
  );
}
