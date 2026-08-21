"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  PRICE_NOTICE,
  PRICE_NOTICE_DELAY_MS,
  PRICE_NOTICE_ENABLED,
  PRICE_NOTICE_STORAGE_KEY,
} from "@/lib/price-notice";

/**
 * Delayed, non-blocking "prices may differ" card. Slides in from the bottom
 * PRICE_NOTICE_DELAY_MS after the first page of a session, never on /admin.
 * Not a modal: nothing is blocked, no focus is stolen — browsing to "order
 * sent" stays the same number of taps. Dismiss: Got it / ✕ / Escape.
 *
 * Hydration-safe: the server and the first client render both emit only the
 * empty live-region wrapper; the card is injected after mount + timer.
 */
export default function PriceNotice() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!PRICE_NOTICE_ENABLED || pathname.startsWith("/admin")) return;
    try {
      if (sessionStorage.getItem(PRICE_NOTICE_STORAGE_KEY)) return;
    } catch {
      /* storage unavailable (private mode) — still show once */
    }
    const t = setTimeout(() => {
      setOpen(true);
      try {
        sessionStorage.setItem(PRICE_NOTICE_STORAGE_KEY, "1");
      } catch {
        /* ignore */
      }
    }, PRICE_NOTICE_DELAY_MS);
    return () => clearTimeout(t);
    // Intentionally runs once per mount; the root layout keeps this component
    // alive across client navigations, so the timer is not restarted per page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div role="status" aria-live="polite" aria-atomic="true">
      {open && (
        <div className="fixed inset-x-4 bottom-[5.25rem] z-50 sm:inset-x-auto sm:bottom-5 sm:left-5 sm:max-w-sm">
          <div
            aria-labelledby="price-notice-title"
            className="relative rounded-2xl border border-stone-200 border-t-4 border-t-gold bg-white p-4 pr-10 shadow-lg animate-notice-in motion-reduce:animate-none"
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={PRICE_NOTICE.dismissLabel}
              className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full text-stone-400 hover:bg-stone-100 hover:text-ink"
            >
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
              </svg>
            </button>
            <p id="price-notice-title" className="font-extrabold text-ink">
              {PRICE_NOTICE.headline}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-stone-600">{PRICE_NOTICE.body}</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-3 rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-dark"
            >
              {PRICE_NOTICE.cta}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
