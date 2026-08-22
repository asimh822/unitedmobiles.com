"use client";

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
      className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-ink/60 p-4 animate-fade-in motion-reduce:animate-none"
      onClick={close}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="price-notice-title"
        aria-describedby="price-notice-body"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-2xl border-t-4 border-t-gold bg-white p-6 pr-10 text-center shadow-2xl animate-modal-in motion-reduce:animate-none"
      >
        <button
          type="button"
          onClick={close}
          aria-label={PRICE_NOTICE.dismissLabel}
          className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full text-stone-400 hover:bg-stone-100 hover:text-ink"
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
          </svg>
        </button>
        <p id="price-notice-title" className="text-lg font-extrabold text-ink">
          {PRICE_NOTICE.headline}
        </p>
        <p id="price-notice-body" className="mt-2 text-sm leading-relaxed text-stone-600">
          {PRICE_NOTICE.body}
        </p>
        <button
          ref={confirmRef}
          type="button"
          onClick={close}
          className="mt-5 w-full rounded-xl bg-brand px-4 py-3 font-bold text-white hover:bg-brand-dark"
        >
          {PRICE_NOTICE.cta}
        </button>
      </div>
    </div>
  );
}
