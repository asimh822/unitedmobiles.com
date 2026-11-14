"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { label: string; short?: string; href: string; icon: React.ReactNode; isNew?: boolean };

const svg = "h-4 w-4 shrink-0 stroke-current";
const svgProps = { viewBox: "0 0 24 24", fill: "none", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

const ITEMS: Item[] = [
  {
    label: "New Phones",
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
];

/** Category pills: icon + label; the current section is filled cobalt. */
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
            className={`relative flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-[13px] font-bold transition-colors sm:px-3.5 sm:text-sm ${
              active
                ? "border-brand bg-brand text-white shadow-sm"
                : "border-stone-200 bg-white text-ink hover:border-brand/40 hover:bg-brand/5 hover:text-brand"
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
              <span className="rounded-full bg-gold-light px-1.5 py-px text-[9px] font-extrabold uppercase leading-tight tracking-wide text-ink">
                New
              </span>
            )}
          </Link>
        );
      })}
    </>
  );
}
