"use client";

import { useEffect, useRef } from "react";

/**
 * <details> that closes when the user clicks outside it, follows a link
 * inside it, or presses Escape — a native details stays open until its
 * summary is clicked again.
 */
export default function AutoCloseDetails({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const close = () => {
      if (el.open) el.open = false;
    };
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!el.contains(target) || (target instanceof Element && target.closest("a"))) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <details ref={ref} className={className}>
      {children}
    </details>
  );
}
