/**
 * Price-fluctuation disclaimer — one source of copy for the first-visit modal
 * and every inline note, so the wording never drifts.
 *
 * Why it exists: website prices and the physical counter price can differ in
 * either direction while the worldwide chip shortage keeps moving phone prices
 * week to week. The final price is always confirmed on WhatsApp (our checkout)
 * before delivery, and payment is cash on delivery.
 *
 * Flip PRICE_NOTICE_ENABLED to false once shop and site prices are aligned —
 * that hides the modal and every inline note in one go.
 */
export const PRICE_NOTICE_ENABLED = true;

/**
 * Delay before the modal opens. Not a "don't nag them" delay any more — just
 * long enough for the page behind it to paint, so the customer sees what they
 * landed on before the dialog covers it.
 */
export const PRICE_NOTICE_DELAY_MS = 600;

/** sessionStorage key: the modal shows once per browser session. Bump the
 *  version suffix to re-show it to everyone mid-session after a copy change. */
export const PRICE_NOTICE_STORAGE_KEY = "um-price-notice-v3";

export const PRICE_NOTICE = {
  /** Plain and factual on purpose: a shop notice, not an offer. */
  headline: "About our prices",
  /** Modal, first paragraph — the honest bit. */
  body:
    "Phone prices are moving week to week because of the worldwide chip shortage, so the price you see here may be a little different from today's counter price — up or down.",
  /** Modal, second paragraph — the reassurance. */
  bodyConfirm:
    "When you order on WhatsApp we confirm the exact price with you before anything is delivered, and you pay cash at your door.",
  /** Signs the modal off, so it reads as a note from the shop. */
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
