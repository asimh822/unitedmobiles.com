import type { SpecGroup } from "@/lib/types";

/** Category → icon. Falls back to a chip icon for unknown categories. */
function CategoryIcon({ category }: { category: string }) {
  const c = category.toLowerCase();
  const cls = "h-5 w-5 stroke-brand";
  const common = { fill: "none", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;

  if (c.includes("display") || c.includes("screen"))
    return (
      <svg viewBox="0 0 24 24" className={cls} {...common} aria-hidden="true">
        <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
        <path d="M10.5 5h3" />
      </svg>
    );
  if (c.includes("camera"))
    return (
      <svg viewBox="0 0 24 24" className={cls} {...common} aria-hidden="true">
        <path d="M4 8h3l2-2.5h6L17 8h3v11H4z" />
        <circle cx="12" cy="13" r="3.5" />
      </svg>
    );
  if (c.includes("memory") || c.includes("storage"))
    return (
      <svg viewBox="0 0 24 24" className={cls} {...common} aria-hidden="true">
        <rect x="6" y="6" width="12" height="12" rx="2" />
        <path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" />
      </svg>
    );
  if (c.includes("battery") || c.includes("charging"))
    return (
      <svg viewBox="0 0 24 24" className={cls} {...common} aria-hidden="true">
        <rect x="3" y="8" width="15" height="8" rx="2" />
        <path d="M21 11v2M12.5 9.5 10 12h3l-2.5 2.5" />
      </svg>
    );
  if (c.includes("connect") || c.includes("network"))
    return (
      <svg viewBox="0 0 24 24" className={cls} {...common} aria-hidden="true">
        <path d="M4 10a12 12 0 0 1 16 0M7 13.5a8 8 0 0 1 10 0M10 17a4 4 0 0 1 4 0" />
        <circle cx="12" cy="19.5" r="0.8" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" className={cls} {...common} aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8v4l2.5 2.5" />
    </svg>
  );
}

/** Specs as categorized icon boxes — never paragraphs or long tables. */
export default function SpecBoxes({ specs }: { specs: SpecGroup[] }) {
  if (!specs?.length) return null;
  return (
    <section aria-label="Specifications" className="space-y-5">
      <h2 className="text-xl font-extrabold text-ink">Specifications</h2>
      {specs.map((group) => (
        <div key={group.category}>
          <div className="mb-2 flex items-center gap-2">
            <CategoryIcon category={group.category} />
            <h3 className="text-sm font-bold uppercase tracking-wide text-stone-600">
              {group.category}
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {group.items.map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-stone-200 bg-white p-3"
              >
                <p className="text-xs font-medium text-stone-400">{item.label}</p>
                <p className="mt-0.5 text-sm font-semibold text-ink">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
