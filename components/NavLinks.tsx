"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { label: string; short?: string; href: string; icon: React.ReactNode; isNew?: boolean };

const svg = "h-[18px] w-[18px] shrink-0 stroke-current sm:h-4 sm:w-4";
const svgProps = { viewBox: "0 0 24 24", fill: "none", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

const ITEMS: Item[] = [
  {
    label: "New Phones",
    short: "New",
    href: "/new-phones",
    icon: (
      <svg {...svgProps} className={svg}>
        <rect x="6" y="2" width="12" height="20" rx="2.5" />
        <path d="M11 18h2" />
      </svg>
    ),
  },
  {
    // The DB category and the URL stay "Used" (the EPOS writes it, and old
    // links keep working). Customers see "Pre-Owned".
    label: "Pre-Owned",
    href: "/used",
    isNew: true,
    icon: (
      <svg {...svgProps} className={svg}>
        <path d="M3 12a9 9 0 0 1 15.5-6.2L21 8" />
        <path d="M21 3v5h-5" />
        <path d="M21 12a9 9 0 0 1-15.5 6.2L3 16" />
        <path d="M3 21v-5h5" />
      </svg>
    ),
  },
  {
    label: "KeyPad Phones",
    short: "KeyPad",
    href: "/keypad-phones",
    icon: (
      <svg {...svgProps} className={svg}>
        <rect x="6" y="2" width="12" height="20" rx="2.5" />
        <path d="M9 7h6M9 12h.01M12 12h.01M15 12h.01M9 15.5h.01M12 15.5h.01M15 15.5h.01" />
      </svg>
    ),
  },
  {
    label: "Tabs",
    href: "/tabs",
    icon: (
      <svg {...svgProps} className={svg}>
        <rect x="3" y="3" width="18" height="18" rx="2.5" />
        <path d="M11 17.5h2" />
      </svg>
    ),
  },
  {
    // Short on every screen: "Build Your Phone" overflowed the desktop menu
    // into the tagline. The icon + page title carry the rest.
    label: "Build",
    href: "/build",
    isNew: true,
    icon: (
      <svg {...svgProps} className={svg}>
        <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
        <circle cx="12" cy="12" r="2.5" />
      </svg>
    ),
  },
];

/**
 * Category links; the current section is filled cobalt. On a phone they are
 * five equal tabs (icon over a short label) so every section is on screen with
 * no sideways scrolling; from sm up they are icon + label pills in a row.
 */
export default function NavLinks() {
  const pathname = usePathname();

  return (
    <>
      {ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`relative flex min-w-0 flex-1 flex-col items-center gap-0.5 whitespace-nowrap rounded-xl border px-0.5 py-1 text-[11px] font-bold transition-all active:scale-95 sm:flex-none sm:shrink-0 sm:flex-row sm:gap-1.5 sm:rounded-full sm:px-3.5 sm:py-1.5 sm:text-sm ${
              active
                ? "border-brand bg-brand text-white shadow-md"
                : "border-transparent text-ink hover:border-brand/40 hover:bg-brand/5 hover:text-brand sm:border-stone-200 sm:bg-white"
            }`}
          >
            <span className={active ? "text-white" : "text-brand"}>{item.icon}</span>
            {item.short ? (
              <>
                <span className="sm:hidden">{item.short}</span>
                <span className="hidden sm:inline">{item.label}</span>
              </>
            ) : (
              item.label
            )}
            {item.isNew && (
              <>
                <span aria-hidden="true" className="absolute right-[18%] top-1 h-2 w-2 rounded-full bg-gold-light ring-2 ring-cream sm:hidden" />
                <span className="hidden rounded-full bg-gold-light px-1.5 py-px text-[9px] font-extrabold uppercase leading-tight tracking-wide text-ink sm:inline">
                  New
                </span>
              </>
            )}
          </Link>
        );
      })}
    </>
  );
}
