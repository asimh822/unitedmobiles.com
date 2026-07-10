import Link from "next/link";
import AutoCloseDetails from "@/components/AutoCloseDetails";
import { ACCESSORY_SUBCATEGORIES, SOUND_SUBCATEGORIES, categoryPath } from "@/lib/categories";

const TOP_ITEMS = [
  { label: "New Phones", href: "/new-phones" },
  { label: "Used", href: "/used" },
  { label: "KeyPad Phones", href: "/keypad-phones" },
  { label: "Tabs", href: "/tabs" },
] as const;

const pill =
  "shrink-0 whitespace-nowrap rounded-full border border-stone-200 bg-white px-3.5 py-1.5 text-ink hover:border-brand/40 hover:bg-brand/5 hover:text-brand";

/**
 * Category menu, embeddable next to the logo. Accessories uses a <details>
 * element (AutoCloseDetails closes it on outside click/link click/Escape);
 * its panel is a full-width horizontal strip positioned against the header
 * (the nav is an overflow-x-auto scroller, which would clip a dropdown
 * anchored inside it).
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
          className="shrink-0 whitespace-nowrap rounded-lg px-2.5 py-2 text-ink hover:bg-brand/5 hover:text-brand sm:px-3"
        >
          {item.label}
        </Link>
      ))}

      <AutoCloseDetails className="group shrink-0">
        <summary className="flex cursor-pointer list-none items-center gap-1 whitespace-nowrap rounded-lg px-2.5 py-2 text-ink hover:bg-brand/5 hover:text-brand group-open:bg-brand/5 group-open:text-brand sm:px-3 [&::-webkit-details-marker]:hidden">
          Accessories
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current transition-transform group-open:rotate-180" fill="none" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </summary>
        {/* Anchored to the relative <header>, not this nav, so the scroller can't clip it. */}
        <div className="absolute inset-x-0 top-full z-50 border-b border-stone-200 bg-white shadow-lg">
          <div className="mx-auto flex max-w-6xl items-center gap-1.5 overflow-x-auto px-4 py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Link href="/accessories" className={pill}>
              All Accessories
            </Link>
            {ACCESSORY_SUBCATEGORIES.filter((s) => s !== "Sound").map((sub) => (
              <Link key={sub} href={categoryPath("Accessories", sub)} className={pill}>
                {sub}
              </Link>
            ))}
            <span aria-hidden="true" className="mx-1 h-5 w-px shrink-0 bg-stone-200" />
            <Link href={categoryPath("Accessories", "Sound")} className={pill}>
              Sound
            </Link>
            {SOUND_SUBCATEGORIES.map((sub) => (
              <Link
                key={sub}
                href={categoryPath("Accessories", "Sound", sub)}
                className={`${pill} text-stone-500`}
              >
                {sub}
              </Link>
            ))}
          </div>
        </div>
      </AutoCloseDetails>
    </nav>
  );
}
