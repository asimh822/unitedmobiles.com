import { formatPrice } from "@/lib/format";

export const WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "923239637000";

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
