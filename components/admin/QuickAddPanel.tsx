"use client";

import { useState } from "react";
import {
  parseQuickAdd,
  type QuickAddFields,
  type QuickAddResult,
} from "@/lib/quick-text";

const PLACEHOLDER = `Brand: Vivo
Model: Y19s
Price: Rs. 43,999
RAM: 8GB
ROM: 256GB
Screen: 6.68"
Network: 4G`;

/**
 * Paste a stripped-down supplier message and pre-fill the Add Product form.
 * Parsing is pure client-side text matching — see lib/quick-text.ts.
 */
export default function QuickAddPanel({ onApply }: { onApply: (fields: QuickAddFields) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [result, setResult] = useState<QuickAddResult | null>(null);

  function parse() {
    const r = parseQuickAdd(text);
    setResult(r);
    onApply(r.fields);
  }

  return (
    <section className="rounded-2xl border border-brand/30 bg-brand/5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <span className="font-extrabold text-ink">⚡ Quick Add from Text</span>
        <span className="text-sm font-semibold text-brand">{open ? "Hide" : "Paste supplier text"}</span>
      </button>
      {open && (
        <div className="space-y-3 px-5 pb-5">
          <p className="text-xs text-stone-500">
            One field per line as <span className="font-semibold">Label: Value</span> — order and
            case don&apos;t matter. Recognized: Brand, Model, Price, RAM, ROM, Screen size,
            Network (4G/5G). Screen and network go into the Specs section.
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={7}
            placeholder={PLACEHOLDER}
            className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 font-mono text-sm text-ink focus:border-brand focus:outline-none"
          />
          <button
            type="button"
            onClick={parse}
            disabled={!text.trim()}
            className="rounded-xl bg-brand px-5 py-2.5 text-sm font-extrabold text-white hover:bg-brand-dark disabled:opacity-50"
          >
            Parse &amp; fill form
          </button>
          {result && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {result.matched.map((label) => (
                  <span
                    key={label}
                    className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700"
                  >
                    ✓ {label}
                  </span>
                ))}
                {result.missing.map((label) => (
                  <span
                    key={label}
                    className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-500"
                  >
                    — {label}
                  </span>
                ))}
              </div>
              {result.matched.length > 0 && (
                <p className="text-xs font-semibold text-emerald-700">
                  Form filled below — everything stays editable before saving.
                </p>
              )}
              {result.unrecognized.length > 0 && (
                <p className="text-xs text-amber-700">
                  Not understood (fill manually):{" "}
                  {result.unrecognized.map((l) => `"${l}"`).join(", ")}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
