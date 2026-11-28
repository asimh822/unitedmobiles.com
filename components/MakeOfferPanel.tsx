"use client";

import { useState } from "react";
import { formatConditionScore, type Product } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { SITE_URL } from "@/lib/site";
import { buildBestPriceLink, buildOfferLink, shortRef, type OfferPhone } from "@/lib/whatsapp";

/**
 * "Want a better price?" for EPOS phones (Pre-Owned and Kits): every handset is
 * unique, so the price is open to a chat.
 *
 * Two ways in, both ending on WhatsApp where the shop takes it from there:
 *  - "What's your best price?": one tap, no number to think about. This is
 *    the low-commitment path for a buyer who is unsure about naming a price.
 *  - "Make an offer": the buyer types any amount. NO price floor and no preset
 *    amounts, on purpose: presets get the lowest one tapped every time, and
 *    even a silly offer is a conversation. A very low or at-list amount only
 *    gets a quiet note, never a block.
 *
 * Each tap is logged anonymously (app/api/offer, table offers) before
 * WhatsApp opens, so the shop also sees offers that were never sent.
 */
export default function MakeOfferPanel({ product, price }: { product: Product; price: number }) {
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState("");

  const phone: OfferPhone = {
    name: `${product.brand} ${product.model}`,
    price,
    condition: formatConditionScore(product.conditionScore),
    ref: shortRef(product.eposRef),
    url: `${SITE_URL}/products/${product.id}`,
  };

  const amount = Number(raw.replace(/\D/g, "")) || 0;
  const tooLow = amount > 0 && amount < price * 0.5;
  const atList = amount >= price;

  function log(kind: "best_price" | "offer") {
    try {
      const body = JSON.stringify({
        productId: product.id,
        eposRef: product.eposRef ?? null,
        name: phone.name,
        asking: price,
        kind,
        ...(kind === "offer" ? { amount } : {}),
      });
      navigator.sendBeacon?.("/api/offer", body);
    } catch {
      /* logging never gets in the way */
    }
  }

  return (
    <div className="space-y-3 rounded-2xl border border-stone-200 bg-white p-4">
      <p className="text-center text-[15px] font-extrabold text-ink">Want a better price? Let&apos;s talk.</p>

      <a
        href={buildBestPriceLink(phone)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => log("best_price")}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-wa-dark px-5 py-3.5 text-base font-extrabold text-white shadow-sm transition active:scale-[.99]"
      >
        <WaIcon />
        What&apos;s your best price?
      </a>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full rounded-2xl border-2 border-wa-dark/40 px-5 py-3 text-base font-extrabold text-wa-dark transition hover:border-wa-dark active:scale-[.99]"
        >
          Make an offer
        </button>
      ) : (
        <div className="space-y-2 rounded-2xl border-2 border-wa-dark/40 p-3 animate-fade-in">
          <label htmlFor="offer-amount" className="block text-sm font-bold text-ink">
            Your offer
          </label>
          <div className="flex items-center gap-2 rounded-xl border border-stone-300 bg-cream px-3 focus-within:border-wa-dark">
            <span className="text-lg font-bold text-stone-500">Rs.</span>
            <input
              id="offer-amount"
              autoFocus
              inputMode="numeric"
              autoComplete="off"
              placeholder="Type your price"
              value={amount ? amount.toLocaleString("en-US") : ""}
              onChange={(e) => setRaw(e.target.value.slice(0, 12))}
              className="w-full bg-transparent py-3 text-xl font-extrabold text-ink outline-none placeholder:text-base placeholder:font-semibold placeholder:text-stone-400"
            />
          </div>
          {tooLow && (
            <p className="text-[13px] text-amber-700">
              That&apos;s well below our price of {formatPrice(price)}, but send it anyway if you like. We reply to
              every offer.
            </p>
          )}
          {atList && (
            <p className="text-[13px] text-emerald-700">
              That&apos;s our listed price, so you can also just tap Buy Now.
            </p>
          )}
          {amount > 0 ? (
            <a
              href={buildOfferLink(phone, amount)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => log("offer")}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-wa-dark px-5 py-3 text-base font-extrabold text-white transition active:scale-[.99]"
            >
              <WaIcon />
              Send {formatPrice(amount)} offer on WhatsApp
            </a>
          ) : (
            <span className="flex w-full cursor-not-allowed items-center justify-center rounded-xl bg-stone-200 px-5 py-3 text-base font-extrabold text-stone-400">
              Send offer on WhatsApp
            </span>
          )}
        </div>
      )}

      <ul className="space-y-1 text-[13px] text-stone-600">
        <li>✓ No obligation, it&apos;s just a chat</li>
        <li>✓ See and check the phone at our shop before you pay</li>
        <li>✓ We reply to every offer, low or high</li>
      </ul>
    </div>
  );
}

function WaIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 fill-current" aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.6-6.1c-.3-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.3-.6.8-.8 1-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.4-3c-.3-.4 0-.5.2-.7l.4-.5c.1-.2.2-.3.1-.5l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.2s1 2.5 1.1 2.7c.1.2 1.9 3 4.7 4.2.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.6-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2 0-.1-.2-.2-.5-.3Z" />
    </svg>
  );
}
