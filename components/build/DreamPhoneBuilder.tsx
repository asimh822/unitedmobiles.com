"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ScreenMode, StageApi } from "@/components/build/PhoneStage";
import {
  COLORS,
  colorName,
  diffs,
  estimate,
  pickMatches,
  reserveMessage,
  summary,
  untilTime,
  PERSONAS,
  type BuildPhone,
  type BuildState,
  type Persona,
  type Pick,
} from "@/lib/build-match";
import { formatPrice } from "@/lib/format";
import { WHATSAPP_NUMBER } from "@/lib/whatsapp";

const loadStage = () => import("@/components/build/PhoneStage");
// three.js only loads once a persona is picked; nothing else on the site pays for it.
const PhoneStage = dynamic(loadStage, {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 grid place-items-center">
      <div className="h-48 w-24 animate-pulse rounded-[22px] bg-stone-200" />
    </div>
  ),
});

type Step = "persona" | "build" | "searching" | "results";
type Tab = "screen" | "camera" | "battery" | "storage" | "speed" | "color";

const svgProps = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, className: "h-5 w-5" } as const;
const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "screen", label: "Size", icon: <svg {...svgProps}><rect x="6" y="2" width="12" height="20" rx="2.5" /><path d="M3 6v12M21 6v12" /></svg> },
  { id: "camera", label: "Camera", icon: <svg {...svgProps}><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg> },
  { id: "battery", label: "Battery", icon: <svg {...svgProps}><rect x="6" y="4" width="12" height="18" rx="2" /><path d="M10 2h4M12 9l-2 4h4l-2 4" /></svg> },
  { id: "storage", label: "Storage", icon: <svg {...svgProps}><path d="M3 7h18v12H3zM3 7l2-3h14l2 3M8 12h8" /></svg> },
  { id: "speed", label: "Speed", icon: <svg {...svgProps}><path d="M13 2 4 14h7l-1 8 9-12h-7z" /></svg> },
  { id: "color", label: "Colour", icon: <svg {...svgProps}><path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.5-.8 1.5-1.5 0-1.2-1-1.5-1-2.5S13.4 15 14.5 15H17a4 4 0 0 0 4-4c0-4.4-4-8-9-8Z" /><circle cx="7.5" cy="11" r="1" /><circle cx="10" cy="7" r="1" /><circle cx="15" cy="7.5" r="1" /></svg> },
];

const MODE: Partial<Record<Tab, ScreenMode>> = { battery: "battery", speed: "speed", storage: "storage" };

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

const buzz = () => {
  try {
    navigator.vibrate?.(8);
  } catch {
    /* not supported */
  }
};

export default function DreamPhoneBuilder({ phones }: { phones: BuildPhone[] }) {
  const [step, setStep] = useState<Step>("persona");
  const [persona, setPersona] = useState<Persona | null>(null);
  const [st, setSt] = useState<BuildState>(PERSONAS[0].start);
  const [tab, setTab] = useState<Tab>("screen");
  const [gl, setGl] = useState(true);
  const [hint, setHint] = useState(true);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [dreamImg, setDreamImg] = useState<string | null>(null);
  const [copied, setCopied] = useState<"" | "ok" | "fail">("");
  const stage = useRef<StageApi | null>(null);
  const logId = useRef<string | null>(null);
  const top = useRef<HTMLDivElement>(null);

  const price = estimate(st);
  const [swing, setSwing] = useState(0);
  const lastPrice = useRef(price);
  useEffect(() => {
    if (lastPrice.current !== price) setSwing((n) => n + 1);
    lastPrice.current = price;
  }, [price]);

  const set = useCallback(<K extends keyof BuildState>(k: K, v: BuildState[K]) => {
    setSt((s) => ({ ...s, [k]: v }));
  }, []);

  function start(p: Persona) {
    buzz();
    setGl(hasWebGL());
    setPersona(p);
    setSt(p.start);
    setTab("screen");
    setStep("build");
    top.current?.scrollIntoView({ block: "start" });
  }

  function restart() {
    setStep("persona");
    setPicks([]);
    setDreamImg(null);
    window.scrollTo(0, 0);
  }

  function find() {
    if (!persona) return;
    buzz();
    setStep("searching");
    window.scrollTo(0, 0);
    const result = pickMatches(st, persona.weights, phones);
    setTimeout(() => {
      try {
        setDreamImg(stage.current?.snapshot(st) ?? null);
      } catch {
        setDreamImg(null);
      }
      setPicks(result);
      setCopied("");
      setStep("results");
      logId.current = null;
      fetch("/api/build-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ persona: persona.id, build: st, est: estimate(st), picks: result.map((p) => p.phone.id) }),
      })
        .then((r) => (r.status === 200 ? r.json() : null))
        .then((j) => {
          if (j?.id) logId.current = j.id;
        })
        .catch(() => {});
    }, 1300);
  }

  function reserved(i: number) {
    if (!logId.current) return;
    const body = JSON.stringify({ id: logId.current, whatsappPick: i });
    if (!navigator.sendBeacon?.("/api/build-log", body)) {
      fetch("/api/build-log", { method: "POST", body, keepalive: true }).catch(() => {});
    }
  }

  async function share() {
    const txt = `I built my dream phone at United Mobiles: ${summary(st)}.${
      picks[0] ? ` My match: ${picks[0].phone.name}.` : ""
    } Build yours at unitedmobiles.net/build`;
    try {
      await navigator.clipboard.writeText(txt);
      setCopied("ok");
    } catch {
      setCopied("fail");
    }
  }

  return (
    <div ref={top} className="mx-auto max-w-xl scroll-mt-20 pb-32 pt-4">
      {step === "persona" && <PersonaStep onPick={start} onWarm={() => void loadStage()} />}

      {/* The stage stays mounted through searching/results so the 3D scene isn't rebuilt on "Edit". */}
      {step !== "persona" && (
        <section className={step === "build" ? "" : "hidden"} aria-label="Build your phone">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-sm font-bold text-ink">
              <span aria-hidden="true">{persona?.emoji}</span> {persona?.name}
            </p>
            <button
              type="button"
              onClick={restart}
              className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-bold text-stone-600 hover:border-brand/40 hover:text-brand"
            >
              Start over
            </button>
          </div>

          <div className="relative h-[42vh] max-h-[440px] min-h-[260px] overflow-hidden rounded-3xl border border-stone-200 bg-[radial-gradient(ellipse_at_50%_35%,#ffffff_0%,#eef2fa_45%,#dfe6f3_100%)]">
            {gl ? (
              <PhoneStage
                st={st}
                mode={MODE[tab] ?? "home"}
                faceBack={tab === "camera" || tab === "color"}
                paused={step !== "build"}
                onReady={(api) => (stage.current = api)}
                onFirstDrag={() => setHint(false)}
              />
            ) : (
              <FlatPhone st={st} />
            )}
            <div className="pointer-events-none absolute left-4 top-4 text-2xl font-extrabold text-ink">
              {st.screen.toFixed(1)}&quot;
              <small className="block text-[10px] font-semibold tracking-widest text-stone-500">SCREEN</small>
            </div>
            <div key={swing} className={`build-tag pointer-events-none absolute right-5 top-7 ${swing ? "build-swing" : ""}`}>
              <div className="relative rounded-l-md rounded-r-2xl bg-gold-light py-2 pl-5 pr-3 text-[15px] font-extrabold text-ink shadow-[0_10px_24px_rgba(192,138,46,.3)]">
                <span aria-hidden="true" className="absolute left-2 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-ink" />
                <small className="block text-[9px] font-bold tracking-wide text-ink/70">EST. PRICE</small>
                <span aria-live="polite">{formatPrice(price)}</span>
              </div>
            </div>
            {gl && (
              <p
                className={`pointer-events-none absolute inset-x-0 bottom-2 text-center text-[11px] font-medium text-stone-500 transition-opacity duration-500 ${
                  hint ? "opacity-100" : "opacity-0"
                }`}
              >
                👆 Drag the phone to spin it
              </p>
            )}
          </div>

          <div role="tablist" aria-label="Phone features" className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {TABS.map((t) => {
              const on = t.id === tab;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => {
                    buzz();
                    setTab(t.id);
                  }}
                  className={`flex min-w-[66px] shrink-0 flex-col items-center gap-0.5 rounded-2xl border px-3 py-2 text-xs font-bold transition-colors ${
                    on ? "border-brand bg-brand text-white shadow-sm" : "border-stone-200 bg-white text-ink hover:border-brand/40"
                  }`}
                >
                  <span className={on ? "text-white" : "text-brand"}>{t.icon}</span>
                  {t.label}
                </button>
              );
            })}
          </div>

          <div role="tabpanel" className="mt-1 min-h-[150px] rounded-3xl border border-stone-200 bg-white p-4">
            <Panel tab={tab} st={st} set={set} />
          </div>

          {step === "build" && (
            <div className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-cream/95 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
              <button
                type="button"
                onClick={find}
                className="mx-auto block w-full max-w-xl rounded-2xl bg-brand px-6 py-4 text-center text-lg font-extrabold text-white shadow-md transition-colors hover:bg-brand-dark active:scale-[.99]"
              >
                ✨ Find my real phone
              </button>
            </div>
          )}
        </section>
      )}

      {step === "searching" && (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6" role="status">
          <div className="build-shuffle relative h-48 w-28">
            <div /> <div /> <div />
          </div>
          <p className="font-semibold text-stone-500">Searching our shelves…</p>
        </div>
      )}

      {step === "results" && persona && (
        <Results
          st={st}
          picks={picks}
          dreamImg={dreamImg}
          copied={copied}
          onEdit={() => {
            setStep("build");
            window.scrollTo(0, 0);
          }}
          onAgain={restart}
          onShare={share}
          onReserve={reserved}
        />
      )}
    </div>
  );
}

/* ------------------------------ persona step ------------------------------ */

function PersonaStep({ onPick, onWarm }: { onPick: (p: Persona) => void; onWarm: () => void }) {
  return (
    <section aria-labelledby="build-title">
      <h1 id="build-title" className="text-2xl font-extrabold leading-tight text-ink sm:text-3xl">
        Build your <span className="text-brand">dream phone</span>
      </h1>
      <p className="mb-5 mt-1 text-sm text-stone-500 sm:text-base">
        Pick your style. Shape it, spin it, make it yours. Then we find the real phone on our shelf.
      </p>
      <div className="grid grid-cols-2 gap-3" onPointerEnter={onWarm} onTouchStart={onWarm}>
        {PERSONAS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onPick(p)}
            className={`group relative overflow-hidden rounded-3xl border p-4 text-left transition active:scale-[.97] ${
              p.wide
                ? "col-span-2 border-dashed border-stone-300 bg-transparent text-center hover:border-brand/50"
                : "border-stone-200 bg-white hover:border-brand/40 hover:shadow-sm"
            }`}
          >
            {!p.wide && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-25 blur-2xl"
                style={{ background: p.glow }}
              />
            )}
            <span aria-hidden="true" className="relative mb-1.5 block text-4xl">
              {p.emoji}
            </span>
            <b className="relative block text-base font-extrabold text-ink">{p.name}</b>
            <small className="relative text-xs text-stone-500">{p.hint}</small>
          </button>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------ panels ------------------------------ */

type Setter = <K extends keyof BuildState>(k: K, v: BuildState[K]) => void;

function Chips<K extends keyof BuildState>({ k, st, set, opts }: { k: K; st: BuildState; set: Setter; opts: [BuildState[K], string, string?][] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {opts.map(([v, label, sub]) => {
        const on = st[k] === v;
        return (
          <button
            key={String(v)}
            type="button"
            aria-pressed={on}
            onClick={() => {
              buzz();
              set(k, v);
            }}
            className={`min-w-[60px] flex-1 rounded-2xl border px-1.5 py-3 text-center text-sm font-extrabold transition-colors ${
              on ? "border-brand bg-brand/5 text-brand" : "border-stone-200 bg-white text-ink hover:border-brand/40"
            }`}
          >
            {label}
            {sub && <small className="block text-[10px] font-medium text-stone-500">{sub}</small>}
          </button>
        );
      })}
    </div>
  );
}

function Range({ k, st, set, min, max, step, label }: { k: "screen" | "battery"; st: BuildState; set: Setter; min: number; max: number; step: number; label: string }) {
  const v = st[k];
  return (
    <input
      type="range"
      aria-label={label}
      min={min}
      max={max}
      step={step}
      value={v}
      onChange={(e) => set(k, Number(e.target.value))}
      onPointerUp={buzz}
      className="build-range my-3.5"
      style={{ "--p": `${((v - min) / (max - min)) * 100}%` } as React.CSSProperties}
    />
  );
}

function Panel({ tab, st, set }: { tab: Tab; st: BuildState; set: Setter }) {
  const title = (t: string, h: string) => (
    <>
      <p className="text-[17px] font-extrabold text-ink">{t}</p>
      <p className="mb-3 text-xs text-stone-500">{h}</p>
    </>
  );
  if (tab === "screen")
    return (
      <>
        {title("How big should it feel?", "Slide and watch the phone grow.")}
        <Range k="screen" st={st} set={set} min={6.1} max={6.9} step={0.1} label="Screen size" />
        <div className="flex justify-between text-[11px] text-stone-500">
          <span>Pocket size</span>
          <span>Movie screen</span>
        </div>
      </>
    );
  if (tab === "camera")
    return (
      <>
        {title("Build your camera", "Add lenses. Higher MP = bigger, sharper lenses.")}
        <div className="mb-3">
          <Chips k="lenses" st={st} set={set} opts={[[1, "●", "1 lens"], [2, "●●", "2 lenses"], [3, "●●●", "3 lenses"], [4, "●●●●", "4 lenses"]]} />
        </div>
        <Chips k="mp" st={st} set={set} opts={[[13, "13MP", "basic"], [50, "50MP", "sharp"], [108, "108MP", "pro"], [200, "200MP", "zoom king"]]} />
      </>
    );
  if (tab === "battery") {
    const u = untilTime(st.battery);
    return (
      <>
        {title("How long should it last?", "Off the charger at 8 AM. Watch the day go by.")}
        <Range k="battery" st={st} set={set} min={4000} max={7000} step={500} label="Battery size" />
        <div className="relative mt-1 h-10">
          <span className="absolute -top-0.5 -translate-x-1/2 text-[15px] transition-[left] duration-500" style={{ left: `${u.frac * 100}%` }} aria-hidden="true">
            {u.hours < 12 ? "☀️" : u.hours < 18 ? "🌆" : "🌙"}
          </span>
          <div className="absolute inset-x-0 top-4 h-2.5 overflow-hidden rounded-full bg-stone-100">
            <div className="h-full bg-gradient-to-r from-gold-light via-gold to-brand transition-[width] duration-500" style={{ width: `${u.frac * 100}%` }} />
          </div>
          <div className="absolute inset-x-0 top-7 flex justify-between text-[10px] text-stone-500">
            <span>8 AM</span><span>2 PM</span><span>8 PM</span><span>2 AM</span><span>8 AM</span>
          </div>
        </div>
        <p className="mt-1 text-center text-xs font-bold text-turq-deep">Lasts till {u.txt}</p>
      </>
    );
  }
  if (tab === "storage")
    return (
      <>
        {title("How much do you keep?", "See what fits on the phone's screen.")}
        <Chips k="storage" st={st} set={set} opts={[[64, "64GB"], [128, "128GB"], [256, "256GB"], [512, "512GB"]]} />
      </>
    );
  if (tab === "speed")
    return (
      <>
        {title("How fast?", "More RAM = more apps open, smoother games.")}
        <Chips k="ram" st={st} set={set} opts={[[4, "4GB", "calls & chat"], [6, "6GB", "daily use"], [8, "8GB", "fast"], [12, "12GB", "gaming beast"]]} />
      </>
    );
  return (
    <>
      {title("Pick your colour", "Tap to repaint. Spin it to see the shine.")}
      <div className="flex flex-wrap justify-center gap-3.5">
        {COLORS.map(([name, hex]) => {
          const on = st.color === hex;
          return (
            <button
              key={hex}
              type="button"
              aria-label={name}
              aria-pressed={on}
              onClick={() => {
                buzz();
                set("color", hex);
              }}
              className={`h-12 w-12 rounded-full border-[3px] shadow-[inset_-6px_-8px_14px_rgba(0,0,0,.3),inset_6px_6px_10px_rgba(255,255,255,.3)] transition-transform ${
                on ? "scale-110 border-brand" : "border-white ring-1 ring-stone-200"
              }`}
              style={{ background: `radial-gradient(circle at 30% 30%, #ffffff55, ${hex} 55%)` }}
            />
          );
        })}
      </div>
      <p className="mt-2.5 text-center text-xs font-semibold text-stone-500">{colorName(st.color)}</p>
    </>
  );
}

/** No WebGL (very old browsers): a flat phone that still grows and repaints. */
function FlatPhone({ st }: { st: BuildState }) {
  const w = 120 + (st.screen - 6.1) * 30;
  return (
    <div className="absolute inset-0 grid place-items-center">
      <div
        className="rounded-[26px] p-1.5 shadow-xl transition-all duration-300"
        style={{ width: w, height: w * 2.1, background: st.color }}
      >
        <div className="flex h-full w-full flex-col items-center justify-center rounded-[20px] bg-gradient-to-b from-[#3b6fd0] to-[#07080f] text-white">
          <b className="text-xl">{st.ram}GB</b>
          <span className="text-xs opacity-80">{st.storage}GB</span>
          <span className="mt-2 text-xs opacity-80">{st.battery.toLocaleString("en-US")} mAh</span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ results ------------------------------ */

function Results({
  st,
  picks,
  dreamImg,
  copied,
  onEdit,
  onAgain,
  onShare,
  onReserve,
}: {
  st: BuildState;
  picks: Pick[];
  dreamImg: string | null;
  copied: "" | "ok" | "fail";
  onEdit: () => void;
  onAgain: () => void;
  onShare: () => void;
  onReserve: (i: number) => void;
}) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const ids = picks.map((_, i) => setTimeout(() => {
      setShown(i + 1);
      buzz();
    }, 250 + i * 450));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduced && picks.length) confetti();
    return () => ids.forEach(clearTimeout);
  }, [picks]);

  const waLinks = useMemo(
    () => picks.map((p) => `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(reserveMessage(st, p))}`),
    [picks, st],
  );

  return (
    <section aria-labelledby="match-title">
      <div className="mb-1 flex items-start justify-between gap-3">
        <h1 id="match-title" className="text-2xl font-extrabold leading-tight text-ink sm:text-3xl">
          {picks.length ? "We found your match! 🎉" : "Nothing close enough yet"}
        </h1>
        <button
          type="button"
          onClick={onEdit}
          className="shrink-0 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-bold text-stone-600 hover:border-brand/40 hover:text-brand"
        >
          ← Edit my phone
        </button>
      </div>
      <p className="mb-4 text-sm text-stone-500">
        {picks.length
          ? "Real phones from our shelf, closest to what you built."
          : "Tell us what you built on WhatsApp and we'll find it for you."}
      </p>

      <div className="mb-4 flex items-center gap-3 rounded-3xl border border-stone-200 bg-white px-4 py-3">
        {dreamImg ? (
          <Image src={dreamImg} alt="Your dream phone" width={70} height={94} unoptimized className="h-[94px] w-[70px] object-contain" />
        ) : (
          <div aria-hidden="true" className="h-[86px] w-[42px] shrink-0 rounded-xl border-4 border-white shadow" style={{ background: st.color }} />
        )}
        <div className="text-xs leading-relaxed text-stone-500">
          <b className="text-sm text-ink">Your dream phone</b>
          <br />
          {summary(st)}
          <br />
          {colorName(st.color)} · Est. {formatPrice(estimate(st))}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {picks.map((p, i) => {
          const pct = Math.max(40, Math.min(99, Math.round(p.score * 100)));
          const ring = pct >= 85 ? "var(--color-turq-deep)" : pct >= 70 ? "var(--color-brand)" : "var(--color-gold)";
          const best = i === 0;
          return (
            <div key={p.phone.id} className={`build-flip ${shown > i ? "is-shown" : ""}`}>
              <div className="build-flip-inner">
                <article className={`build-face rounded-3xl border bg-white px-4 py-3.5 ${best ? "border-brand shadow-[0_0_0_3px_rgba(28,78,156,.12)]" : "border-stone-200"}`}>
                  <Link href={`/products/${p.phone.id}`} className="flex items-center gap-3">
                    <div className="relative h-[110px] w-[82px] shrink-0">
                      {p.phone.image ? (
                        <Image src={p.phone.image} alt={p.phone.name} fill sizes="82px" className="object-contain" />
                      ) : (
                        <div className="grid h-full w-full place-items-center rounded-2xl bg-stone-100 text-2xl" aria-hidden="true">📱</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className={`mb-1 inline-block rounded-lg px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${best ? "bg-brand text-white" : "bg-gold-light text-ink"}`}>
                        {p.label}
                      </span>
                      <h2 className="text-base font-extrabold leading-tight text-ink">
                        {p.phone.name}
                        {p.phone.preOwned && (
                          <span className="ml-1.5 inline-block whitespace-nowrap rounded-md bg-turq/10 px-1.5 py-0.5 align-middle text-[10px] font-bold text-turq-deep">
                            Pre-Owned{p.phone.condition ? ` ${p.phone.condition}` : ""}
                          </span>
                        )}
                      </h2>
                      {p.combo.label && <p className="text-xs text-stone-500">{p.combo.label}</p>}
                      <p className="text-[15px] font-extrabold text-brand">{formatPrice(p.combo.price)}</p>
                      {!p.phone.inStock && <p className="text-[11px] font-bold text-gold-dark">Out of stock right now</p>}
                    </div>
                    <div
                      className="relative grid h-[62px] w-[62px] shrink-0 place-items-center rounded-full"
                      style={{ background: `conic-gradient(${ring} ${pct * 3.6}deg, #e7e5e4 0)` }}
                      aria-label={`${pct}% match`}
                    >
                      <span className="absolute inset-[6px] rounded-full bg-white" />
                      <span className="relative text-base font-extrabold text-ink">{pct}%</span>
                      <small className="absolute bottom-2.5 text-[7px] font-bold tracking-wide text-stone-500">MATCH</small>
                    </div>
                  </Link>
                  <div className="my-3 flex flex-wrap gap-1.5">
                    {diffs(st, p.phone, p.combo).map((d) => (
                      <span key={d.text} className={`rounded-lg px-2 py-1 text-[11px] font-semibold ${d.good ? "bg-turq/10 text-turq-deep" : "bg-gold/10 text-gold-dark"}`}>
                        {d.good ? "✓" : "•"} {d.text}
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/products/${p.phone.id}`}
                      className="flex-1 rounded-2xl border border-stone-200 px-3 py-3 text-center text-sm font-bold text-ink hover:border-brand/40 hover:text-brand"
                    >
                      View phone
                    </Link>
                    <a
                      href={waLinks[i]}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => onReserve(i)}
                      className="flex flex-[1.6] items-center justify-center gap-1.5 rounded-2xl bg-brand px-3 py-3 text-center text-sm font-extrabold text-white shadow-sm hover:bg-brand-dark"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                        <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.6-6.1c-.3-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.3-.6.8-.8 1-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.4-3c-.3-.4 0-.5.2-.7l.4-.5c.1-.2.2-.3.1-.5l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.2s1 2.5 1.1 2.7c.1.2 1.9 3 4.7 4.2.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.6-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2 0-.1-.2-.2-.5-.3Z" />
                      </svg>
                      Reserve on WhatsApp
                    </a>
                  </div>
                </article>
                <div aria-hidden="true" className="build-face build-back grid place-items-center rounded-3xl bg-gradient-to-br from-brand to-brand-dark text-sm font-extrabold tracking-[.3em] text-white/50">
                  UNITED
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!picks.length && (
        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hi United Mobiles! I built my dream phone on your website (${summary(st)}). What do you have like this?`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-2xl bg-brand px-6 py-4 text-center font-extrabold text-white"
        >
          Ask us on WhatsApp
        </a>
      )}

      <div className="mt-6 flex flex-col items-center gap-3">
        <button type="button" onClick={onShare} className="rounded-2xl bg-stone-100 px-5 py-3 text-sm font-bold text-ink hover:bg-stone-200">
          {copied === "ok" ? "✓ Copied! Paste it in WhatsApp" : copied === "fail" ? "Copy not allowed here" : "📋 Copy my dream phone to share"}
        </button>
        <button type="button" onClick={onAgain} className="rounded-2xl border border-stone-300 px-5 py-3 text-sm font-bold text-ink hover:border-brand/40 hover:text-brand">
          🛠️ Build another
        </button>
      </div>
      <p className="mt-5 text-center text-[11px] text-stone-400">
        Prices and stock are live from our shop and can change. Match % compares each phone with what you built.
      </p>
    </section>
  );
}

function confetti() {
  const cols = ["#1c4e9c", "#eec868", "#2e8b99", "#c08a2e", "#f97316"];
  for (let i = 0; i < 50; i++) {
    const d = document.createElement("div");
    d.className = "build-confetti";
    d.style.left = `${Math.random() * 100}vw`;
    d.style.background = cols[i % cols.length];
    d.style.animationDuration = `${1.6 + Math.random() * 1.6}s`;
    d.style.animationDelay = `${Math.random() * 0.4}s`;
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 3800);
  }
}
