import { formatPrice } from "@/lib/format";

export const WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "923109627000";

export interface OrderAddon {
  name: string;
  price: number;
}

export interface OrderDetails {
  brand: string;
  model: string;
  color: string;
  /** RAM+ROM combo label, e.g. "8GB + 256GB" — appended to the phone name. */
  combo?: string | null;
  price: number;
  /** Accessories added on the order-review screen. */
  addons?: OrderAddon[];
  customerName: string;
  address: string;
}

/** Exact order-message template — do not reword without checking with the shop. */
export function buildOrderMessage(o: OrderDetails): string {
  const addons = o.addons ?? [];
  const total = o.price + addons.reduce((sum, a) => sum + a.price, 0);
  return [
    "New Order Request \u{1F4F1}",
    `Phone: ${o.brand} ${o.model}${o.combo ? ` (${o.combo})` : ""}`,
    `Color: ${o.color}`,
    `Price: ${formatPrice(o.price)}`,
    ...(addons.length > 0
      ? [
          "Add-ons:",
          ...addons.map((a) => `- ${a.name} — ${formatPrice(a.price)}`),
          `Total: ${formatPrice(total)}`,
        ]
      : []),
    `Customer Name: ${o.customerName}`,
    `Address: ${o.address}`,
  ].join("\n");
}

export function buildOrderLink(o: OrderDetails): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(buildOrderMessage(o))}`;
}

/** Floating "Chat with us" button — general inquiries, separate from checkout. */
export function buildChatLink(): string {
  const msg = "Hi United Mobiles! I have a question about a phone.";
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
}

/* ---------------- Offers on EPOS phones (Pre-Owned and Kits) ---------------- */

export interface OfferPhone {
  name: string;
  /** Asking price on the site. */
  price: number;
  /** "8.5/10" or null. */
  condition: string | null;
  /** Short shop ref, "U-123" / "K-45": tells the shop exactly which handset. */
  ref: string | null;
  url: string;
}

/** "used-123" -> "U-123", "kit-45" -> "K-45". Never an IMEI. */
export function shortRef(eposRef: string | null | undefined): string | null {
  const m = /^(used|kit)-(\d+)$/.exec(eposRef ?? "");
  return m ? `${m[1] === "used" ? "U" : "K"}-${m[2]}` : null;
}

function phoneLines(p: OfferPhone): string[] {
  const head = [p.name, p.condition ? `${p.condition} condition` : null, `listed ${formatPrice(p.price)}`]
    .filter(Boolean)
    .join(" · ");
  return [head, ...(p.ref ? [`Ref: ${p.ref}`] : []), p.url];
}

/** Worded like a person asking, not a form: people send that more readily. */
export function buildBestPriceLink(p: OfferPhone): string {
  const msg = ["Hi! What's your best price on this phone?", "", ...phoneLines(p)].join("\n");
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
}

export function buildOfferLink(p: OfferPhone, amount: number): string {
  const msg = [`Hi! Would you take ${formatPrice(amount)} for this phone?`, "", ...phoneLines(p)].join("\n");
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
}
