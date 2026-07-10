import type { SpecGroup } from "@/lib/types";

type HighlightKey = "screen" | "processor" | "camera" | "battery" | "network";

interface Highlight {
  key: HighlightKey;
  label: string;
  value: string;
}

function findValue(specs: SpecGroup[], labelRe: RegExp, categoryRe?: RegExp): string | null {
  for (const g of specs) {
    if (categoryRe && !categoryRe.test(g.category)) continue;
    for (const item of g.items) {
      if (labelRe.test(item.label) && item.value.trim()) return item.value.trim();
    }
  }
  return null;
}

/**
 * The specs buyers actually decide on — screen, processor, main camera,
 * battery, network. RAM/ROM is deliberately excluded: the variant selector
 * already shows it.
 */
export function extractHighlights(specs: SpecGroup[]): Highlight[] {
  const out: Highlight[] = [];

  const screen = findValue(specs, /screen size|display size/i);
  if (screen) {
    out.push({
      key: "screen",
      label: "Screen Size",
      value: screen.replace(/(\d+(?:\.\d+)?)\s*inch(?:es)?/i, '$1"'),
    });
  }

  const processor = findValue(specs, /processor|chipset/i) ?? findValue(specs, /^cpu$/i);
  if (processor) out.push({ key: "processor", label: "Processor", value: processor });

  const camera = findValue(specs, /(back|main|rear)\s*camera/i) ?? findValue(specs, /^camera$/i);
  if (camera) {
    const lenses = camera.split("+").map((s) => s.trim()).filter(Boolean);
    out.push({
      key: "camera",
      label: "Main Camera",
      value: lenses.length > 1 ? `${lenses[0]} (${lenses.length} lenses)` : lenses[0],
    });
  }

  // Battery capacity hides under different labels ("Type", "Capacity") — the
  // mAh value itself is the reliable marker.
  let battery: string | null = null;
  for (const g of specs) {
    for (const item of g.items) {
      if (/\d\s*mah\b/i.test(item.value)) {
        battery = item.value.trim();
        break;
      }
    }
    if (battery) break;
  }
  if (!battery) battery = specs.find((g) => /battery/i.test(g.category))?.items[0]?.value ?? null;
  if (battery) {
    out.push({
      key: "battery",
      label: "Battery",
      value: battery.replace(/(\d)\s*mah\b/i, "$1 mAh"),
    });
  }

  const items = specs.flatMap((g) => g.items);
  const supports = (re: RegExp) =>
    items.some((it) => re.test(it.label) && /^(yes|supported)/i.test(it.value.trim()));
  const nets: string[] = [];
  if (supports(/4g|lte/i)) nets.push("4G");
  if (supports(/^5g/i)) nets.push("5G");
  if (nets.length) out.push({ key: "network", label: "Network", value: nets.join(" / ") });

  return out;
}

function HighlightIcon({ k }: { k: HighlightKey }) {
  const cls = "h-5 w-5 shrink-0 stroke-brand";
  const common = { fill: "none", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  switch (k) {
    case "screen":
      return (
        <svg viewBox="0 0 24 24" className={cls} {...common} aria-hidden="true">
          <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
          <path d="M10.5 5h3" />
        </svg>
      );
    case "processor":
      return (
        <svg viewBox="0 0 24 24" className={cls} {...common} aria-hidden="true">
          <rect x="6" y="6" width="12" height="12" rx="2" />
          <path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" />
        </svg>
      );
    case "camera":
      return (
        <svg viewBox="0 0 24 24" className={cls} {...common} aria-hidden="true">
          <path d="M4 8h3l2-2.5h6L17 8h3v11H4z" />
          <circle cx="12" cy="13" r="3.5" />
        </svg>
      );
    case "battery":
      return (
        <svg viewBox="0 0 24 24" className={cls} {...common} aria-hidden="true">
          <rect x="3" y="8" width="15" height="8" rx="2" />
          <path d="M21 11v2M12.5 9.5 10 12h3l-2.5 2.5" />
        </svg>
      );
    case "network":
      return (
        <svg viewBox="0 0 24 24" className={cls} {...common} aria-hidden="true">
          <path d="M4 10a12 12 0 0 1 16 0M7 13.5a8 8 0 0 1 10 0M10 17a4 4 0 0 1 4 0" />
          <circle cx="12" cy="19.5" r="0.8" />
        </svg>
      );
  }
}

/** Compact icon boxes beside the price with the specs buyers care about most. */
export default function KeyHighlights({ specs }: { specs: SpecGroup[] }) {
  const highlights = extractHighlights(specs);
  if (!highlights.length) return null;
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {highlights.map((h) => (
        <div
          key={h.key}
          className="flex items-start gap-2 rounded-xl border border-stone-200 bg-white p-2.5"
        >
          <HighlightIcon k={h.key} />
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-stone-400">{h.label}</p>
            <p className="mt-0.5 line-clamp-2 text-[13px] font-semibold leading-snug text-ink">
              {h.value}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
