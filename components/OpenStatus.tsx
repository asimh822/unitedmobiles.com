"use client";

import { useEffect, useState } from "react";
import { CLOSES, OPENING_DAYS, OPENS } from "@/lib/business";

const mins = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

const clock = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, "0")}` : ""} ${h < 12 ? "AM" : "PM"}`;
};

function status(): { open: boolean; text: string } {
  // The shop's clock, whatever the visitor's own time zone is.
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Karachi",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const day = get("weekday");
  const now = (Number(get("hour")) % 24) * 60 + Number(get("minute"));
  const openDay = (OPENING_DAYS as readonly string[]).includes(day);

  if (openDay && now >= mins(OPENS) && now < mins(CLOSES)) {
    return { open: true, text: `Open now · till ${clock(CLOSES)}` };
  }
  if (openDay && now < mins(OPENS)) return { open: false, text: `Opens ${clock(OPENS)}` };
  return { open: false, text: `Closed · opens ${clock(OPENS)}` };
}

/**
 * "Open now · till 9 PM" with a live dot, from the hours in lib/business.ts.
 * Renders nothing until mounted: the pages are static, so the server cannot
 * know what time the visitor arrives.
 */
export default function OpenStatus({ className = "" }: { className?: string }) {
  const [s, setS] = useState<ReturnType<typeof status> | null>(null);

  useEffect(() => {
    setS(status());
    const id = setInterval(() => setS(status()), 60_000);
    return () => clearInterval(id);
  }, []);

  if (!s) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap font-semibold animate-fade-in ${className}`}>
      <span className={`h-2 w-2 rounded-full ${s.open ? "live-dot bg-emerald-500" : "bg-stone-400"}`} />
      <span className={s.open ? "text-emerald-700" : "text-stone-500"}>{s.text}</span>
    </span>
  );
}
