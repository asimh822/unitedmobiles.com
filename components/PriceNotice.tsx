"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  PRICE_NOTICE,
  PRICE_NOTICE_DELAY_MS,
  PRICE_NOTICE_ENABLED,
  PRICE_NOTICE_STORAGE_KEY,
} from "@/lib/price-notice";

/** How long the note stays up if the customer neither reads nor closes it. */
const AUTO_HIDE_MS = 14000;

/**
 * First-visit "prices may differ" note. It used to be a modal over a dimmed
 * page, which put a tap between every new visitor and the phones. Now it is a
 * small card that slides up from the bottom corner once per session
 * (sessionStorage): the page behind stays fully usable, and the card leaves on
 * "Got it", ✕, Escape, or by itself after a few seconds. The same message sits
 * under the price on every product page and on the checkout review, so nobody
 * orders without having seen it.
 *
 * Never on /admin, and not on /build (the builder is a one-screen sheet with no
 * room to spare); it waits for the next page instead.
 *
 * Styled as a note from the shop, not an ad: tile edge on top, plain words, no
 * offer, no urgency.
 */
export default function PriceNotice() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const shown = useRef(false);

  const quiet = pathname.startsWith("/admin") || pathname === "/build";

  useEffect(() => {
    if (!PRICE_NOTICE_ENABLED || quiet || shown.current) return;
    try {
      if (sessionStorage.getItem(PRICE_NOTICE_STORAGE_KEY)) {
        shown.current = true;
        return;
      }
    } catch {
      /* storage unavailable (private mode): still show once */
    }
    const t = setTimeout(() => {
      shown.current = true;
      setOpen(true);
      try {
        sessionStorage.setItem(PRICE_NOTICE_STORAGE_KEY, "1");
      } catch {
        /* ignore */
      }
    }, PRICE_NOTICE_DELAY_MS);
    return () => clearTimeout(t);
  }, [quiet]);

  useEffect(() => {
    if (!open) return;
    const hide = setTimeout(() => setOpen(false), AUTO_HIDE_MS);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(hide);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!open || quiet) return null;

  return (
    <div
      role="status"
      aria-labelledby="price-notice-title"
      className={`fixed left-3 right-20 z-[45] max-w-sm overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl animate-slide-up motion-reduce:animate-none sm:left-5 sm:right-auto ${
        // Clear of the pinned Buy bar on a phone's product page; beside the
        // WhatsApp button everywhere else.
        pathname.startsWith("/products/") ? "bottom-24 lg:bottom-5" : "bottom-4 sm:bottom-5"
      }`}
    >
      <div className="tile-edge" />
      <div className="flex items-start gap-3 p-3.5">
        <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand/10 text-base">
          💬
        </span>
        <div className="min-w-0 flex-1">
          <p id="price-notice-title" className="text-sm font-extrabold text-ink">
            {PRICE_NOTICE.headline}
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-stone-600">{PRICE_NOTICE.toast}</p>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-2 rounded-full bg-brand px-4 py-1.5 text-xs font-bold text-white hover:bg-brand-dark"
          >
            {PRICE_NOTICE.cta}
          </button>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label={PRICE_NOTICE.dismissLabel}
          className="-mr-1 -mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full text-stone-400 hover:bg-stone-100 hover:text-ink"
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
