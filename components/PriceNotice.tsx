"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  PRICE_NOTICE,
  PRICE_NOTICE_DELAY_MS,
  PRICE_NOTICE_ENABLED,
  PRICE_NOTICE_STORAGE_KEY,
} from "@/lib/price-notice";

/**
 * First-visit "prices may differ" modal. Opens over a dim backdrop shortly
 * after the first page of a session (once per session, via sessionStorage),
 * never on /admin. The customer taps "Got it" to carry on — one extra tap, and
 * only ever one per session, so browsing to "order sent" is otherwise
 * untouched. Dismiss: Got it / ✕ / Escape / tapping the backdrop.
 *
 * Styled to read as a note from the shop rather than an ad: the shop logo signs
 * it, the kashi tile-edge motif from the product cards runs along the top, the
 * text is left-aligned at a readable measure, and it fades in without a bounce.
 * No offer, no urgency, no exclamation marks — the moment this looks like a
 * promo popup, customers dismiss it without reading and the honesty is wasted.
 *
 * Hydration-safe: the server and the first client render both emit nothing;
 * the dialog is injected after mount + timer.
 */
export default function PriceNotice() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  /** Whatever had focus before we opened, so we can hand it back on close. */
  const restoreRef = useRef<Element | null>(null);

  const close = useCallback(() => setOpen(false), []);

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

  // While open: lock the page behind, focus the primary button, keep Tab inside
  // the dialog, and close on Escape. All of it is undone on close.
  useEffect(() => {
    if (!open) return;

    restoreRef.current = document.activeElement;
    confirmRef.current?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        close();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = panel.querySelectorAll<HTMLElement>("button, [href]");
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      if (restoreRef.current instanceof HTMLElement) restoreRef.current.focus();
    };
  }, [open, close]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-ink/45 p-4 backdrop-blur-[2px] animate-fade-in motion-reduce:animate-none"
      onClick={close}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="price-notice-title"
        aria-describedby="price-notice-body"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl animate-modal-in motion-reduce:animate-none"
      >
        {/* Same mosaic strip as the product cards — ties the notice to the site. */}
        <div className="tile-edge" />
        <button
          type="button"
          onClick={close}
          aria-label={PRICE_NOTICE.dismissLabel}
          className="absolute right-2 top-4 grid h-9 w-9 place-items-center rounded-full text-stone-400 hover:bg-stone-100 hover:text-ink"
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
          </svg>
        </button>

        <div className="p-5 pr-12 sm:p-6 sm:pr-14">
          <div className="flex items-center gap-3">
            <Image
              src="/shop-logo.png"
              alt=""
              width={640}
              height={375}
              aria-hidden="true"
              className="h-9 w-auto shrink-0 rounded-md"
            />
            <h2 id="price-notice-title" className="text-base font-extrabold text-ink sm:text-lg">
              {PRICE_NOTICE.headline}
            </h2>
          </div>

          <div id="price-notice-body" className="mt-4 space-y-3 text-sm leading-relaxed text-stone-600">
            <p>{PRICE_NOTICE.body}</p>
            <p>{PRICE_NOTICE.bodyConfirm}</p>
          </div>

          <p className="mt-4 border-t border-stone-200 pt-3 text-xs font-semibold text-stone-500">
            — {PRICE_NOTICE.signature}
          </p>

          <button
            ref={confirmRef}
            type="button"
            onClick={close}
            className="mt-4 w-full rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white hover:bg-brand-dark sm:w-auto sm:px-8"
          >
            {PRICE_NOTICE.cta}
          </button>
        </div>
      </div>
    </div>
  );
}
