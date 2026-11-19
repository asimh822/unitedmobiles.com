"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import KeyHighlights from "@/components/KeyHighlights";
import PriceTag from "@/components/PriceTag";
import SpecsTable from "@/components/SpecsTable";
import TrustBadges from "@/components/TrustBadges";
import { colorNameToHex } from "@/lib/color-names";
import { PAYMENT, paymentSplit } from "@/lib/payment";
import { PRICE_NOTICE, PRICE_NOTICE_ENABLED } from "@/lib/price-notice";
import { formatPrice } from "@/lib/format";
import { effectivePrice, ramRomCombos, type Product, type RamRomCombo, type Variant } from "@/lib/types";

/**
 * Client island for the product page: gallery + TWO independent selectors
 * (Color, RAM+ROM combo) + variant-aware price/stock/Buy Now, the key spec
 * highlights and the full spec sheet. One model with many RAM+ROM combos is
 * ONE page — never duplicate listings.
 *
 * Layout: on a phone the order is title/price → picture → options → buy →
 * specs, so the first screen says what the phone is and what it costs. On
 * desktop the picture takes the left column and everything else the right.
 */
export default function ProductPurchasePanel({ product }: { product: Product }) {
  const variants = product.variants;

  const colors = useMemo(() => {
    const seen = new Map<string, Variant>();
    // Memory-only variants carry an empty color — they don't get a dot.
    for (const v of variants) if (v.color && !seen.has(v.color)) seen.set(v.color, v);
    return [...seen.values()];
  }, [variants]);

  const combos = useMemo(() => ramRomCombos(product), [product]);

  const [colorIdx, setColorIdx] = useState(0);
  // Open on the first RAM+ROM combo that is actually in stock, not an
  // out-of-stock one with Buy Now greyed out.
  const [comboIdx, setComboIdx] = useState(() =>
    Math.max(
      0,
      combos.findIndex((c) =>
        variants.some(
          (v) => v.inStock && (c.ram ? v.ram === c.ram : true) && (c.storage ? v.storage === c.storage : true),
        ),
      ),
    ),
  );
  const [imageIdx, setImageIdx] = useState(0);

  const selectedColor = colors[colorIdx]?.color ?? null;
  const selectedCombo: RamRomCombo | null = combos[comboIdx] ?? null;

  const matchesCombo = (v: Variant, c: RamRomCombo | null) =>
    !c || ((c.ram ? v.ram === c.ram : true) && (c.storage ? v.storage === c.storage : true));

  // Exact color+combo variant when it exists; otherwise fall back to the combo
  // (pricing follows RAM+ROM) and finally the color alone.
  const exact = variants.find(
    (v) => (selectedColor ? v.color === selectedColor : true) && matchesCombo(v, selectedCombo),
  );
  const variant: Variant | null =
    exact ??
    variants.find((v) => matchesCombo(v, selectedCombo)) ??
    variants.find((v) => v.color === selectedColor) ??
    null;

  // Gallery = the picture of the SELECTED colour + the product's own photos.
  // Showing every colour's photo in the strip duplicated the swatches and put
  // five thumbnails under the word "Black".
  const gallery = useMemo(() => {
    const own = variants
      .filter((v) => v.color === selectedColor)
      .map((v) => v.image)
      .filter((i): i is string => Boolean(i));
    return [...new Set([...own, ...product.images])];
  }, [product.images, variants, selectedColor]);

  function selectColor(i: number) {
    setColorIdx(i);
    setImageIdx(0); // the colour's own photo leads the gallery
  }

  const currentImage = gallery[imageIdx] ?? gallery[0];
  const comboAvailable = (c: RamRomCombo) =>
    variants.some((v) => matchesCombo(v, c) && v.inStock);
  const inStock =
    product.stockStatus === "in_stock" && (variant ? variant.inStock : true);

  const checkoutHref = variant
    ? `/checkout/${product.id}?variant=${encodeURIComponent(variant.id)}`
    : `/checkout/${product.id}`;

  const hasSpecs = product.specs.some((g) => g.items.some((i) => i.value.trim()));

  // Phones: a Buy Now bar is pinned to the bottom of the screen whenever the
  // real button is not on it, so ordering is one tap from anywhere on the page.
  const buyRef = useRef<HTMLDivElement>(null);
  const [buyVisible, setBuyVisible] = useState(false);
  useEffect(() => {
    const el = buyRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setBuyVisible(e.isIntersecting), { threshold: 0.6 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const payNow = effectivePrice(product, variant);
  const barLabel = [selectedCombo?.label, selectedColor].filter(Boolean).join(" · ");

  return (
    <div className="grid gap-6 pb-20 lg:grid-cols-[2fr_3fr] lg:grid-rows-[auto_1fr] lg:gap-x-10 lg:gap-y-5 lg:pb-0">
      {/* 1. Title + price — first on mobile, top of the right column on desktop */}
      <div className="space-y-3 lg:col-start-2 lg:row-start-1">
        <div>
          <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-brand">{product.brand}</p>
          <h1 className="mt-1 text-[1.65rem] font-extrabold leading-tight tracking-tight text-ink sm:text-3xl">
            {product.model}
          </h1>
        </div>
        <div className="flex flex-wrap items-end gap-x-4 gap-y-1">
          <PriceTag
            product={product}
            price={variant?.price ?? product.price}
            salePrice={variant?.salePrice ?? product.salePrice}
            size="lg"
          />
          <p
            className={`mb-0.5 flex items-center gap-1.5 text-sm font-semibold ${
              inStock ? "text-emerald-700" : "text-stone-400"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${inStock ? "live-dot bg-emerald-500" : "bg-stone-400"}`} />
            {inStock ? "In stock — ready to deliver" : "Out of stock"}
          </p>
        </div>
        {PRICE_NOTICE_ENABLED && <p className="text-xs text-stone-500">{PRICE_NOTICE.productInline}</p>}
        <TrustBadges product={product} />
      </div>

      {/* 2. Gallery — left column on desktop, spanning both rows */}
      <div className="space-y-3 lg:col-start-1 lg:row-start-1 lg:row-span-2">
        <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-2xl border border-stone-200 bg-white lg:max-w-full">
          {currentImage ? (
            <Image
              src={currentImage}
              alt={`${product.brand} ${product.model}${selectedColor ? ` — ${selectedColor}` : ""}`}
              key={currentImage}
              fill
              priority
              sizes="(max-width: 1024px) 384px, 40vw"
              className="object-contain p-4 animate-fade-in"
            />
          ) : (
            <div className="grid h-full place-items-center text-6xl text-stone-300">📱</div>
          )}
        </div>

        {/* Colour dots directly under the picture */}
        {colors.length > 0 && (
          <div className="flex flex-col items-center gap-1.5 py-1">
            <div className="flex flex-wrap items-center justify-center gap-3">
              {colors.map((c, i) => (
                <button
                  key={c.color}
                  type="button"
                  onClick={() => selectColor(i)}
                  aria-label={c.color}
                  aria-pressed={i === colorIdx}
                  title={c.color}
                  className={`h-8 w-8 rounded-full border border-stone-300 transition-all active:scale-90 ${
                    i === colorIdx ? "ring-2 ring-brand ring-offset-2" : "hover:ring-2 hover:ring-stone-300 hover:ring-offset-1"
                  }`}
                  style={{ backgroundColor: c.colorHex ?? colorNameToHex(c.color) ?? "#a8a29e" }}
                />
              ))}
            </div>
            <p className="text-sm font-semibold text-stone-600">
              Colour: <span className="text-ink">{selectedColor}</span>
            </p>
          </div>
        )}

        {/* Other angles of the selected colour (only when there is more than one) */}
        {gallery.length > 1 && (
          <div className="flex justify-center gap-2 overflow-x-auto pb-1">
            {gallery.map((img, i) => (
              <button
                key={img}
                type="button"
                onClick={() => setImageIdx(i)}
                aria-label={`View image ${i + 1}`}
                className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 bg-white ${
                  i === imageIdx ? "border-brand" : "border-stone-200"
                }`}
              >
                <Image src={img} alt="" fill sizes="64px" className="object-contain p-1" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 3. Highlights, options, buy, full specs — right column under the title */}
      <div className="space-y-6 lg:col-start-2 lg:row-start-2">
        <KeyHighlights specs={product.specs} />

        {combos.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-bold text-ink">RAM + Storage</p>
            <div className="flex flex-wrap gap-2">
              {combos.map((c, i) => {
                const available = comboAvailable(c);
                const active = i === comboIdx;
                return (
                  <button
                    key={c.label}
                    type="button"
                    onClick={() => setComboIdx(i)}
                    aria-pressed={active}
                    className={`rounded-xl border px-4 py-2.5 text-[15px] font-bold transition-all active:scale-95 ${
                      active
                        ? "border-brand bg-brand/5 text-brand"
                        : available
                          ? "border-stone-200 bg-white text-ink hover:border-stone-300"
                          : "border-dashed border-stone-200 bg-stone-50 text-stone-400"
                    }`}
                  >
                    {c.label}
                    {!available && <span className="ml-1.5 text-[11px] font-semibold">(out of stock)</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div ref={buyRef} className="space-y-2">
          {inStock ? (
            <Link
              href={checkoutHref}
              className="cta-shine block w-full rounded-2xl bg-brand px-6 py-4 text-center text-lg font-extrabold text-white shadow-md transition hover:bg-brand-dark active:scale-[.99]"
            >
              Buy Now →
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className="block w-full cursor-not-allowed rounded-2xl bg-stone-300 px-6 py-4 text-center text-lg font-extrabold text-white"
            >
              Out of Stock
            </button>
          )}
          <p className="text-center text-[13px] text-stone-500">
            {(() => {
              const split = paymentSplit(effectivePrice(product, variant));
              return (
                <>
                  Pay just <span className="font-bold text-ink">{split.advance}</span> advance by bank
                  transfer, the rest <span className="font-bold text-ink">({split.onDelivery})</span> cash on
                  delivery.
                </>
              );
            })()}
          </p>
          <p className="text-center text-xs text-stone-400">{PAYMENT.reason}</p>
          {(product.category === "New Phones" || product.category === "Used") && (
            <Link
              href="/build"
              className="flex items-center justify-center gap-1.5 rounded-2xl border border-dashed border-brand/30 bg-brand/5 px-4 py-2.5 text-sm font-bold text-brand hover:border-brand/60"
            >
              Not sure? Build your phone →
            </Link>
          )}
        </div>

        {hasSpecs && <SpecsTable specs={product.specs} />}
      </div>

      {/* Pinned Buy bar (phones and small tablets only). */}
      {!buyVisible && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-cream/95 px-4 pb-[max(10px,env(safe-area-inset-bottom))] pt-2.5 shadow-[0_-8px_24px_-12px_rgba(28,25,23,.25)] backdrop-blur animate-slide-up motion-reduce:animate-none lg:hidden">
          <div className="mx-auto flex max-w-xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-lg font-extrabold leading-tight text-brand">{formatPrice(payNow)}</p>
              <p className="truncate text-[11px] font-medium text-stone-500">
                {barLabel || `${product.brand} ${product.model}`}
              </p>
            </div>
            {inStock ? (
              <Link
                href={checkoutHref}
                className="cta-shine shrink-0 rounded-2xl bg-brand px-7 py-3 text-base font-extrabold text-white shadow-md active:scale-95"
              >
                Buy Now →
              </Link>
            ) : (
              <span className="shrink-0 rounded-2xl bg-stone-300 px-6 py-3 text-base font-extrabold text-white">
                Out of Stock
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
