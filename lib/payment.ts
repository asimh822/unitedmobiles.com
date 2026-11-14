import { formatPrice } from "@/lib/format";

/**
 * Payment terms — one source for every place the site talks about paying.
 *
 * Since Nov 2026 orders are no longer pure cash on delivery: for security the
 * customer transfers a small advance by bank transfer once the salesman has
 * confirmed the order on WhatsApp, and pays the rest in cash at the door.
 *
 * Change the percentage here and every badge, note and amount follows.
 */
export const ADVANCE_PERCENT = 10;

/** Advance in rupees, rounded up to the next Rs. 100 so it is easy to send. */
export function advanceAmount(total: number): number {
  if (!Number.isFinite(total) || total <= 0) return 0;
  return Math.ceil((total * ADVANCE_PERCENT) / 100 / 100) * 100;
}

/** "Rs. 11,500 advance · Rs. 103,499 on delivery" for a given order total. */
export function paymentSplit(total: number): { advance: string; onDelivery: string } {
  const adv = advanceAmount(total);
  return { advance: formatPrice(adv), onDelivery: formatPrice(Math.max(total - adv, 0)) };
}

export const PAYMENT = {
  /** Short badge: trust line, header, footer. */
  short: `${ADVANCE_PERCENT}% Advance, Rest Cash on Delivery`,
  /** Lower-case form for running sentences and meta descriptions. */
  sentence: `${ADVANCE_PERCENT}% advance by bank transfer, rest cash on delivery`,
  /** Buy Now button suffix. */
  button: `Pay ${ADVANCE_PERCENT}% Advance`,
  /** Why we ask — keeps it from reading like a catch. */
  reason: "The advance confirms your booking and protects both of us from fake orders.",
  /** Anti-scam line: bank details only ever come from the shop's own number. */
  safety:
    "We send our bank details on WhatsApp from 0310 9627000 only — never pay a number that isn't ours.",
} as const;
