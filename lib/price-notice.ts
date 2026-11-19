/**
 * Price-fluctuation disclaimer — one source of copy for the first-visit modal
 * and every inline note, so the wording never drifts.
 *
 * Why it exists: website prices and the physical counter price can differ in
 * either direction while the worldwide chip shortage keeps moving phone prices
 * week to week. The final price is always confirmed on WhatsApp (our checkout)
 * before delivery; payment terms live in lib/payment.ts.
 *
 * Flip PRICE_NOTICE_ENABLED to false once shop and site prices are aligned —
 * that hides the modal and every inline note in one go.
 */
export const PRICE_NOTICE_ENABLED = true;

/**
 * Delay before the note slides in: long enough for the page to paint and the
 * customer to see what they landed on first.
 */
export const PRICE_NOTICE_DELAY_MS = 1800;

/** sessionStorage key: the modal shows once per browser session. Bump the
 *  version suffix to re-show it to everyone mid-session after a copy change. */
export const PRICE_NOTICE_STORAGE_KEY = "um-price-notice-v3";

export const PRICE_NOTICE = {
  /** Plain and factual on purpose: a shop notice, not an offer. */
  headline: "About our prices",
  /** First-visit corner note (components/PriceNotice.tsx): both points in one breath. */
  toast:
    "Prices are moving week to week, so today's price may differ a little, up or down. We confirm the exact price with you on WhatsApp before delivery.",
  /** Longer wording, first paragraph (kept for reuse). */
  body:
    "Phone prices are moving week to week because of the worldwide chip shortage, so the price you see here may be a little different from today's counter price — up or down.",
  /** Longer wording, second paragraph (kept for reuse). */
  bodyConfirm:
    "When you order on WhatsApp we confirm the exact price with you before anything is delivered — you pay a small advance, the rest cash at your door.",
  /** Signature for the longer wording. */
  signature: "United Mobiles, Multan",
  cta: "Got it",
  dismissLabel: "Dismiss price notice",
  /** Under the price on the product page. */
  productInline:
    "Prices are changing often right now — we confirm the final price with you on WhatsApp before delivery.",
  /** Above the Confirm button on the checkout review step. */
  checkoutNote:
    "Prices are changing week to week right now — our salesman will confirm the final price with you on WhatsApp before anything is delivered.",
  /** Step 2 of the post-confirm "what happens next" list. */
  confirmStep: "Our salesman replies to confirm your order, the final price and delivery time.",
} as const;
