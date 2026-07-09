import Link from "next/link";
import { ACCESSORY_SUBCATEGORIES, SOUND_SUBCATEGORIES, categoryPath } from "@/lib/categories";

const TOP_ITEMS = [
  { label: "New Phones", href: "/new-phones" },
  { label: "Used", href: "/used" },
  { label: "KeyPad Phones", href: "/keypad-phones" },
  { label: "Tabs", href: "/tabs" },
] as const;

/**
 * Category menu, embeddable next to the logo. Accessories uses a <details>
 * dropdown so it works on touch and mouse without client JS.
 */
export default function NavMenu() {
  return (
    <nav
      aria-label="Categories"
      className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto text-sm font-semibold sm:gap-1"
    >
      {TOP_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="shrink-0 whitespace-nowrap rounded-lg px-2.5 py-2 text-ink hover:bg-teal-50 hover:text-brand sm:px-3"
        >
          {item.label}
        </Link>
      ))}

      <details className="group relative shrink-0">
        <summary className="flex cursor-pointer list-none items-center gap-1 whitespace-nowrap rounded-lg px-2.5 py-2 text-ink hover:bg-teal-50 hover:text-brand sm:px-3 [&::-webkit-details-marker]:hidden">
          Accessories
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current transition-transform group-open:rotate-180" fill="none" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </summary>
        <div className="absolute right-0 top-full z-50 mt-1 w-52 rounded-xl border border-stone-200 bg-white p-2 shadow-lg sm:left-0 sm:right-auto">
          {ACCESSORY_SUBCATEGORIES.filter((s) => s !== "Sound").map((sub) => (
            <Link
              key={sub}
              href={categoryPath("Accessories", sub)}
              className="block rounded-lg px-3 py-2 text-ink hover:bg-teal-50 hover:text-brand"
            >
              {sub}
            </Link>
          ))}
          <div className="mt-1 border-t border-stone-100 pt-1">
            <Link
              href={categoryPath("Accessories", "Sound")}
              className="block rounded-lg px-3 py-2 font-bold text-ink hover:bg-teal-50 hover:text-brand"
            >
              Sound
            </Link>
            {SOUND_SUBCATEGORIES.map((sub) => (
              <Link
                key={sub}
                href={categoryPath("Accessories", "Sound", sub)}
                className="block rounded-lg py-1.5 pl-6 pr-3 text-stone-600 hover:bg-teal-50 hover:text-brand"
              >
                {sub}
              </Link>
            ))}
          </div>
        </div>
      </details>
    </nav>
  );
}
