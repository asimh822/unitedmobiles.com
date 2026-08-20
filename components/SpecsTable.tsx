import type { SpecGroup } from "@/lib/types";

/**
 * Full specification sheet, grouped the way the data is stored (General,
 * Display, Memory, …). This is the page's real content — for the buyer who
 * wants the detail and for Google, which treats a five-tile page as thin.
 */
export default function SpecsTable({ specs }: { specs: SpecGroup[] }) {
  const groups = specs.filter((g) => g.items.some((i) => i.value.trim()));
  if (!groups.length) return null;
  return (
    <section aria-labelledby="specs-heading" className="rounded-2xl border border-stone-200 bg-white">
      <h2 id="specs-heading" className="border-b border-stone-200 px-4 py-3 text-base font-extrabold text-ink sm:px-5">
        Full specifications
      </h2>
      <div className="divide-y divide-stone-100">
        {groups.map((g) => (
          <div key={g.category} className="px-4 py-3 sm:px-5">
            <h3 className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-brand">{g.category}</h3>
            <dl className="grid grid-cols-[minmax(7.5rem,2fr)_3fr] gap-x-4 gap-y-1.5 text-sm sm:grid-cols-[minmax(9rem,1fr)_2fr]">
              {g.items
                .filter((i) => i.value.trim())
                .map((i) => (
                  <div key={i.label} className="contents">
                    <dt className="text-stone-500">{i.label}</dt>
                    <dd className="font-semibold text-ink">{i.value}</dd>
                  </div>
                ))}
            </dl>
          </div>
        ))}
      </div>
    </section>
  );
}
