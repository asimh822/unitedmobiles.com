import Link from "next/link";

const PHONES = [
  { color: "#f2a6b8", rotate: "-14deg", x: "-48%", lenses: 2 },
  { color: "#6fcfb0", rotate: "12deg", x: "48%", lenses: 1 },
  { color: "#1c4e9c", rotate: "0deg", x: "0%", lenses: 3 },
];

/**
 * Homepage carousel slide → /build. Pure CSS phones (no image, no three.js),
 * so it costs the homepage nothing beyond a few divs.
 */
export default function BuildSlide() {
  return (
    <Link
      href="/build"
      className="bg-drift group relative flex min-h-[190px] items-center gap-2 overflow-hidden rounded-3xl bg-gradient-to-br from-cream via-[#f6e7c4] to-gold-light px-5 py-4 text-ink sm:h-[28vh] sm:px-10 sm:py-5"
    >
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -left-10 h-64 w-64 rounded-full bg-white/60 blur-2xl" />

      <div className="relative z-10 min-w-0 flex-1">
        <span className="inline-block rounded-full bg-brand px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-white">
          New · Try it
        </span>
        <h2 className="mt-2 text-2xl font-extrabold leading-tight tracking-tight sm:text-4xl">
          Build your <span className="text-brand">dream phone</span>
        </h2>
        <p className="mt-1 max-w-sm text-[13px] font-semibold text-stone-700 sm:mt-1.5 sm:text-base">
          Pick the screen, camera, battery and colour. We find the real one on our shelf.
        </p>
        <span className="cta-shine mt-3 inline-block rounded-full bg-brand px-4 py-1.5 text-sm font-extrabold text-white shadow-md transition group-hover:bg-brand-dark">
          Start building →
        </span>
      </div>

      <div aria-hidden="true" className="float-y relative -mr-2 h-32 w-20 shrink-0 sm:mr-0 sm:h-[24vh] sm:w-[18vh]">
        {PHONES.map((p) => (
          <div
            key={p.color}
            className="absolute inset-y-0 left-1/2 w-[62%] transition-transform duration-300 group-hover:scale-105"
            style={{ transform: `translateX(calc(-50% + ${p.x})) rotate(${p.rotate})` }}
          >
            <div
              className="relative h-full w-full rounded-[18px] border-2 border-white/70 shadow-lg"
              style={{ background: `linear-gradient(150deg, ${p.color}, color-mix(in srgb, ${p.color} 60%, #000))` }}
            >
              <div className="absolute left-2 top-2 flex flex-col gap-1 rounded-xl bg-black/25 p-1">
                {Array.from({ length: p.lenses }, (_, i) => (
                  <span key={i} className="block h-3 w-3 rounded-full border-2 border-stone-300 bg-stone-900 sm:h-4 sm:w-4" />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Link>
  );
}
