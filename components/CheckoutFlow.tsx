"use client";

import Image from "next/image";
import { useState } from "react";
import { formatPrice } from "@/lib/format";
import { buildOrderLink } from "@/lib/whatsapp";
import { effectivePrice, type Product, type Variant } from "@/lib/types";

interface Props {
  product: Product;
  variant: Variant | null;
  /** "Goes with this device" products offered as one-tap add-ons on review. */
  addons?: Product[];
}

/**
 * Two-step checkout: (1) name + address only — WhatsApp captures the sender's
 * phone number, so no phone/email/payment fields; (2) review screen with Edit,
 * one-tap accessory add-ons, then confirm opens the pre-filled wa.me link.
 */
export default function CheckoutFlow({ product, variant, addons = [] }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);

  const price = effectivePrice(product, variant);
  const color = variant?.color || "Standard";
  const combo = variant ? [variant.ram, variant.storage].filter(Boolean).join(" + ") : "";
  const image = variant?.image ?? product.images[0];

  const selectedAddons = addons.filter((a) => addonIds.includes(a.id));
  const total = price + selectedAddons.reduce((sum, a) => sum + effectivePrice(a), 0);

  const order = {
    brand: product.brand,
    model: product.model,
    color,
    combo: combo || null,
    price,
    addons: selectedAddons.map((a) => ({ name: `${a.brand} ${a.model}`, price: effectivePrice(a) })),
    customerName: name.trim(),
    address: address.trim(),
  };

  function toggleAddon(id: string) {
    setAddonIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function submitDetails(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !address.trim()) return;
    setStep(2);
  }

  const inputClass =
    "w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-ink placeholder:text-stone-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";

  return (
    <div className="mx-auto max-w-lg space-y-5">
      {/* Progress */}
      <ol className="flex items-center gap-2 text-xs font-bold">
        {["Your Details", "Confirm Order"].map((label, i) => {
          const active = step === i + 1;
          const done = step > i + 1;
          return (
            <li key={label} className="flex flex-1 items-center gap-2">
              <span
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${
                  active || done ? "bg-brand text-white" : "bg-stone-200 text-stone-500"
                }`}
              >
                {done ? "✓" : i + 1}
              </span>
              <span className={active ? "text-ink" : "text-stone-400"}>{label}</span>
              {i === 0 && <span className="h-px flex-1 bg-stone-200" />}
            </li>
          );
        })}
      </ol>

      {/* Order summary card (always visible) */}
      <div className="flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-4">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-stone-100">
          {image ? (
            <Image src={image} alt={`${product.brand} ${product.model}`} fill sizes="80px" className="object-cover" />
          ) : (
            <div className="grid h-full place-items-center text-2xl text-stone-300">📱</div>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate font-bold text-ink">
            {product.brand} {product.model}
          </p>
          <p className="text-sm text-stone-500">
            {color}
            {combo ? ` · ${combo}` : ""}
          </p>
          <p className="font-extrabold text-brand">{formatPrice(price)}</p>
        </div>
      </div>

      {step === 1 && (
        <form onSubmit={submitDetails} className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5">
          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-bold text-ink">
              Your Name
            </label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ahmed Khan"
              required
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="address" className="mb-1 block text-sm font-bold text-ink">
              Delivery Address
            </label>
            <textarea
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="House / street, area, city"
              required
              rows={3}
              className={inputClass}
            />
          </div>
          <p className="text-xs text-stone-400">
            No phone number needed — we&apos;ll get it automatically when you send the WhatsApp message.
          </p>
          <button
            type="submit"
            className="w-full rounded-2xl bg-brand px-6 py-3.5 text-base font-extrabold text-white hover:bg-brand-dark"
          >
            Review Order
          </button>
        </form>
      )}

      {step === 2 && (
        <div className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5">
          <h2 className="text-lg font-extrabold text-ink">Confirm your order</h2>
          <dl className="space-y-2 text-sm">
            {[
              { label: "Phone", value: `${product.brand} ${product.model}${combo ? ` (${combo})` : ""}` },
              { label: "Color", value: color },
              { label: "Price", value: formatPrice(price) },
              // Add-on rows invert the usual shape: long label, short value.
              ...selectedAddons.map((a) => ({
                label: `+ ${a.brand} ${a.model}`,
                value: formatPrice(effectivePrice(a)),
                longLabel: true,
              })),
              ...(selectedAddons.length > 0 ? [{ label: "Total", value: formatPrice(total) }] : []),
              { label: "Name", value: order.customerName },
              { label: "Address", value: order.address },
            ].map((row) => (
              <div key={row.label} className="flex justify-between gap-4 border-b border-stone-100 pb-2">
                <dt
                  className={`font-semibold text-stone-500 ${
                    "longLabel" in row && row.longLabel ? "min-w-0 break-words" : "shrink-0"
                  }`}
                >
                  {row.label}
                </dt>
                <dd
                  className={`text-right font-semibold ${
                    "longLabel" in row && row.longLabel ? "shrink-0" : ""
                  } ${row.label === "Total" ? "font-extrabold text-brand" : "text-ink"}`}
                >
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>

          {/* One-tap add-ons — the "cart" without a cart. */}
          {addons.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-bold text-ink">Add to your order</p>
              {addons.map((a) => {
                const added = addonIds.includes(a.id);
                return (
                  <div
                    key={a.id}
                    className={`flex items-center gap-3 rounded-xl border p-2 ${
                      added ? "border-brand bg-brand/5" : "border-stone-200 bg-white"
                    }`}
                  >
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-stone-100">
                      {a.images[0] ? (
                        <Image src={a.images[0]} alt="" fill sizes="48px" className="object-contain" />
                      ) : (
                        <div className="grid h-full place-items-center text-lg text-stone-300">🔌</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">
                        {a.brand} {a.model}
                      </p>
                      <p className="text-sm font-bold text-brand">{formatPrice(effectivePrice(a))}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleAddon(a.id)}
                      aria-pressed={added}
                      className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-bold ${
                        added
                          ? "bg-brand text-white"
                          : "border border-brand/40 bg-white text-brand hover:bg-brand/5"
                      }`}
                    >
                      {added ? "✓ Added" : "+ Add"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 rounded-2xl border border-stone-300 bg-white px-4 py-3.5 text-base font-bold text-ink hover:border-stone-400"
            >
              Edit
            </button>
            <a
              href={buildOrderLink(order)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setConfirmed(true)}
              className="flex-[2] rounded-2xl bg-[#25D366] px-4 py-3.5 text-center text-base font-extrabold text-white hover:brightness-95"
            >
              Confirm on WhatsApp
            </a>
          </div>
          {confirmed && (
            <p className="rounded-xl bg-brand/5 p-3 text-center text-sm font-semibold text-brand">
              WhatsApp opened — just press <span className="font-extrabold">Send</span> to place your
              order. Our salesman will confirm shortly.
            </p>
          )}
          <p className="text-center text-xs text-stone-400">
            Pressing Confirm opens WhatsApp with your order pre-filled — nothing is sent until you hit
            Send there. Cash on delivery.
          </p>
        </div>
      )}
    </div>
  );
}
