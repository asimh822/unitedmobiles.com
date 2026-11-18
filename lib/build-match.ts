/**
 * "Build Your Dream Phone" (/build): the builder's options, the price
 * estimate, and the prototype's weighted matching
 * (E:\ShopSoftware\prototypes\build_your_phone.html), run over real stock.
 * Pure functions, safe on server and client.
 */
import { formatPrice } from "@/lib/format";

/* ------------------------------ types ------------------------------ */

export interface BuildState {
  screen: number; // 6.1 to 6.9
  ram: number; // 4 | 6 | 8 | 12
  storage: number; // 64 | 128 | 256 | 512
  battery: number; // 4000 to 7000
  mp: number; // 13 | 50 | 108 | 200
  lenses: number; // 1 to 4
  color: string; // hex
}

type Key = "screen" | "ram" | "storage" | "battery" | "mp" | "lenses" | "price";
export type Weights = Record<Key, number>;

export interface Persona {
  id: string;
  emoji: string;
  name: string;
  hint: string;
  glow: string;
  wide?: boolean;
  start: BuildState;
  weights: Weights;
}

/** One RAM+ROM combo of a phone on the shelf, with what it costs today. */
export interface BuildCombo {
  ram: number | null;
  storage: number | null;
  label: string | null; // "8GB + 256GB"
  price: number;
}

/** A shelf phone as the matcher sees it (built server-side by lib/build-data.ts). */
export interface BuildPhone {
  id: string;
  name: string;
  image: string | null;
  preOwned: boolean;
  condition: string | null; // "8.5/10"
  inStock: boolean;
  screen: number | null;
  battery: number | null;
  mp: number | null;
  lenses: number | null;
  combos: BuildCombo[];
}

export interface Pick {
  phone: BuildPhone;
  combo: BuildCombo;
  score: number;
  label: "Closest twin" | "Smart saver" | "Worth the upgrade" | "Also a great fit";
}

/* ------------------------------ options ------------------------------ */

export const PERSONAS: Persona[] = [
  { id: "gamer", emoji: "🎮", name: "Gamer", hint: "Fast, big screen", glow: "#ef4444",
    start: { screen: 6.8, ram: 12, storage: 256, battery: 6000, mp: 50, lenses: 2, color: "#1c1f26" },
    weights: { ram: 3, screen: 2, battery: 2, storage: 1.5, mp: 0.5, lenses: 0.3, price: 3 } },
  { id: "selfie", emoji: "🤳", name: "Selfie Star", hint: "Best camera", glow: "#ec4899",
    start: { screen: 6.6, ram: 8, storage: 256, battery: 5000, mp: 200, lenses: 3, color: "#f2a6b8" },
    weights: { mp: 3, lenses: 2, storage: 2, ram: 1, battery: 1, screen: 0.5, price: 3 } },
  { id: "battery", emoji: "🔋", name: "Battery King", hint: "Lasts all day+", glow: "#2e8b99",
    start: { screen: 6.7, ram: 6, storage: 128, battery: 7000, mp: 50, lenses: 2, color: "#6fcfb0" },
    weights: { battery: 3.5, ram: 1, storage: 1, mp: 0.7, lenses: 0.3, screen: 0.7, price: 3 } },
  { id: "student", emoji: "🎒", name: "Student", hint: "Smart & affordable", glow: "#1c4e9c",
    start: { screen: 6.6, ram: 4, storage: 128, battery: 5000, mp: 50, lenses: 1, color: "#2b6cb0" },
    weights: { price: 4, battery: 1.5, storage: 1.5, ram: 1, mp: 0.7, lenses: 0.3, screen: 0.5 } },
  { id: "free", emoji: "✏️", name: "Start from scratch", hint: "I know what I want", glow: "#c08a2e", wide: true,
    start: { screen: 6.5, ram: 6, storage: 128, battery: 5000, mp: 50, lenses: 2, color: "#7b5cd6" },
    weights: { ram: 1.5, storage: 1.5, battery: 1.5, mp: 1.5, lenses: 0.5, screen: 1, price: 3 } },
];

export const COLORS: [name: string, hex: string][] = [
  ["Midnight Black", "#1c1f26"],
  ["Ocean Blue", "#2b6cb0"],
  ["Mint Green", "#6fcfb0"],
  ["Rose Pink", "#f2a6b8"],
  ["Champagne Gold", "#d8b26e"],
  ["Cosmic Purple", "#7b5cd6"],
  ["Pearl White", "#e9ebf2"],
];

export const RAM_OPTIONS = [4, 6, 8, 12] as const;
export const STORAGE_OPTIONS = [64, 128, 256, 512] as const;
export const MP_OPTIONS = [13, 50, 108, 200] as const;
export const LENS_OPTIONS = [1, 2, 3, 4] as const;

export const colorName = (hex: string) => COLORS.find((c) => c[1] === hex)?.[0] ?? "Custom";

/* ------------------------------ estimate ------------------------------ */

/** Rough shelf price of the build, rounded to Rs. 500. The base is what the
 *  cheapest 4GB + 64GB smartphones actually cost in the shop (Nov 2026: GO3,
 *  Galaxy A07 4+64 at Rs. 37,000 to 38,200). It was Rs. 15,000, below every
 *  phone on the shelf, so the minimum build out-priced nothing and the
 *  matcher had no price signal left. */
export function estimate(s: BuildState): number {
  const sto = ({ 64: 0, 128: 5000, 256: 14000, 512: 40000 } as Record<number, number>)[s.storage] ?? 0;
  const ram = ({ 4: 0, 6: 4000, 8: 9000, 12: 25000 } as Record<number, number>)[s.ram] ?? 0;
  const mp = ({ 13: 0, 50: 6000, 108: 18000, 200: 45000 } as Record<number, number>)[s.mp] ?? 0;
  const raw = 33000 + sto + ram + mp + (s.lenses - 1) * 6000 + ((s.battery - 4000) / 1000) * 3000 + (s.screen - 6.1) * 10000;
  return Math.round(raw / 500) * 500;
}

/** Battery life on the timeline: off the charger at 8 AM. */
export function untilTime(mah: number) {
  const hours = (mah / 1000) * 3.2;
  const end = 8 + hours;
  const h = Math.floor(end) % 24;
  const m = Math.round((end % 1) * 60);
  return {
    txt: `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}${end >= 24 ? " next day" : ""}`,
    frac: Math.min(1, hours / 24),
    hours,
  };
}

export const summary = (s: BuildState) =>
  `${s.screen.toFixed(1)}" · ${s.ram}GB + ${s.storage}GB · ${s.battery.toLocaleString("en-US")} mAh · ${s.lenses}-lens ${s.mp}MP`;

/* ------------------------------ matching ------------------------------ */

const closeness = (a: number, b: number, tol: number) => Math.max(0, 1 - Math.abs(a - b) / tol);
/** A spec the catalog doesn't know counts as a coin flip, not a perfect fit. */
const UNKNOWN = 0.5;

/** Price fit. Over the tag it decays smoothly with the ratio and never hits
 *  zero: a hard zero made a Rs. 37,000 phone and a Rs. 554,795 one score the
 *  same against a cheap build, so specs alone picked the iPhone. */
function priceFit(target: number, price: number): number {
  if (price <= target * 1.05) return 1 - Math.max(0, (target * 0.6 - price) / target) * 0.5;
  return Math.pow((target * 1.05) / price, 2);
}

/** Having more than asked is good, but far more is a different (dearer) phone:
 *  each doubling past the wish costs a little, floored so it never dominates. */
const overkill = (want: number, have: number, perDoubling: number) =>
  Math.max(0.5, 1 - perDoubling * Math.log2(have / want));

function parts(st: BuildState, ph: BuildPhone, c: BuildCombo): Record<Key, number> {
  const target = estimate(st);
  const atLeast = (want: number, have: number | null, below: () => number, above: () => number = () => 1) =>
    have == null ? UNKNOWN : have >= want ? above() : below();
  return {
    screen: ph.screen == null ? UNKNOWN : closeness(st.screen, ph.screen, 0.8),
    ram: atLeast(st.ram, c.ram, () => closeness(Math.log2(st.ram), Math.log2(c.ram!), 1.6), () => overkill(st.ram, c.ram!, 0.2)),
    storage: atLeast(st.storage, c.storage, () => closeness(Math.log2(st.storage), Math.log2(c.storage!), 2), () => overkill(st.storage, c.storage!, 0.15)),
    battery: atLeast(st.battery, ph.battery, () => closeness(st.battery, ph.battery!, 2500)),
    mp: atLeast(st.mp, ph.mp, () => closeness(Math.log2(st.mp), Math.log2(ph.mp!), 3)),
    lenses: atLeast(st.lenses, ph.lenses, () => closeness(st.lenses, ph.lenses!, 3)),
    price: priceFit(target, c.price),
  };
}

export function score(st: BuildState, w: Weights, ph: BuildPhone, c: BuildCombo): number {
  const p = parts(st, ph, c);
  let t = 0;
  let s = 0;
  for (const k of Object.keys(p) as Key[]) {
    t += p[k] * w[k];
    s += w[k];
  }
  return t / s;
}

/** Out-of-stock phones sink below everything on the shelf today. */
const OUT_OF_STOCK_PENALTY = 0.3;
/** Pre-Owned handsets are one-offs the shop wants moved: a small nudge up the
 *  ranking (not shown in the match %), enough to win a near-tie. */
const PRE_OWNED_BOOST = 0.04;

export function pickMatches(st: BuildState, w: Weights, phones: BuildPhone[]): Pick[] {
  const ranked = phones
    .map((phone) => {
      let best: { combo: BuildCombo; score: number } | null = null;
      for (const combo of phone.combos) {
        const sc = score(st, w, phone, combo);
        if (!best || sc > best.score) best = { combo, score: sc };
      }
      if (!best) return null;
      const rank = best.score - (phone.inStock ? 0 : OUT_OF_STOCK_PENALTY) + (phone.preOwned ? PRE_OWNED_BOOST : 0);
      return { phone, combo: best.combo, score: best.score, rank };
    })
    .filter((x): x is NonNullable<typeof x> => x != null)
    .sort((a, b) => b.rank - a.rank);

  if (!ranked.length) return [];
  const best = ranked[0];
  const price = best.combo.price;
  // A "saver" must actually be cheaper, and an "upgrade" dearer; otherwise
  // the slot goes to the next-best phone under an honest label.
  const saver =
    ranked.find((r) => r !== best && r.combo.price <= price * 0.85) ?? ranked.find((r) => r !== best && r.combo.price < price);
  const up = ranked.find((r) => r !== best && r !== saver && r.combo.price > price);

  const out: Pick[] = [{ ...best, label: "Closest twin" }];
  if (saver) out.push({ ...saver, label: "Smart saver" });
  if (up) out.push({ ...up, label: "Worth the upgrade" });
  for (const r of ranked) {
    if (out.length >= 3) break;
    if (!out.some((o) => o.phone === r.phone)) out.push({ ...r, label: "Also a great fit" });
  }
  return out;
}

/** Up to four "what's different" chips, good news first. */
export function diffs(st: BuildState, ph: BuildPhone, c: BuildCombo): { good: boolean; text: string }[] {
  const out: { good: boolean; text: string }[] = [];
  const target = estimate(st);
  const add = (good: boolean, text: string) => out.push({ good, text });
  if (ph.battery != null) {
    if (ph.battery >= st.battery + 400) add(true, `+${(ph.battery - st.battery).toLocaleString("en-US")} mAh battery`);
    else if (ph.battery <= st.battery - 400) add(false, `${(st.battery - ph.battery).toLocaleString("en-US")} mAh less battery`);
  }
  if (ph.mp != null) {
    if (ph.mp > st.mp) add(true, `${ph.mp}MP camera, sharper`);
    else if (ph.mp < st.mp) add(false, `${ph.mp}MP camera (you wanted ${st.mp})`);
  }
  if (c.ram != null) {
    if (c.ram > st.ram) add(true, `${c.ram}GB RAM, faster`);
    else if (c.ram < st.ram) add(false, `${c.ram}GB RAM (you wanted ${st.ram})`);
  }
  if (c.storage != null) {
    if (c.storage > st.storage) add(true, `${c.storage >= 1024 ? `${c.storage / 1024}TB` : `${c.storage}GB`}, more space`);
    else if (c.storage < st.storage) add(false, `${c.storage}GB storage`);
  }
  if (c.price <= target - 2000) add(true, `${formatPrice(target - c.price)} under your tag`);
  else if (c.price >= target + 2000) add(false, `${formatPrice(c.price - target)} over your tag`);
  if (ph.screen != null && Math.abs(ph.screen - st.screen) < 0.15) add(true, `Same ${ph.screen}" size`);
  return out.sort((a, b) => Number(b.good) - Number(a.good)).slice(0, 4);
}

/** Prefilled "Reserve on WhatsApp" text. Customers see "Pre-Owned", never "Used". */
export function reserveMessage(st: BuildState, p: Pick): string {
  const what = `${p.phone.preOwned ? "Pre-Owned " : ""}${p.phone.name}${p.combo.label ? ` (${p.combo.label})` : ""}${
    p.phone.condition ? `, condition ${p.phone.condition}` : ""
  }`;
  return `Hi United Mobiles! I built my dream phone on your website (${summary(st)}). Is the ${what} at ${formatPrice(
    p.combo.price,
  )} available?`;
}
