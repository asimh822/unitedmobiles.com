"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import PriceTag from "@/components/PriceTag";
import SpecBoxes from "@/components/SpecBoxes";
import TrustBadges from "@/components/TrustBadges";
import { isPhoneLike } from "@/lib/categories";
import { ramRomCombos, type Product, type RamRomCombo, type Variant } from "@/lib/types";

/**
 * Client island for the product page: gallery + TWO independent selectors
 * (Color, RAM+ROM combo) + variant-aware price/stock/Buy Now, plus the spec
 * boxes so the Memory values track the selected combo. One model with many
 * RAM+ROM combos is ONE page — never duplicate listings.
 */
export default function ProductPurchasePanel({ product }: { product: Product }) {
  const variants = product.variants;

  const colors = useMemo(() => {
    const seen = new Map<string, Variant>();
    for (const v of variants) if (!seen.has(v.color)) seen.set(v.color, v);
    return [...seen.values()];
  }, [variants]);

  const combos = useMemo(() => ramRomCombos(product), [product]);

  const [colorIdx, setColorIdx] = useState(0);
  const [comboIdx, setComboIdx] = useState(0);
  const [imageIdx, setImageIdx] = useState(0);

  const selectedColor = colors[colorIdx]?.color ?? null;
  const selectedCombo: RamRomCombo | null = combos[comboIdx] ?? null;

  const matchesCombo = (v: Variant, c: RamRomCombo | null) =>
    !c || ((c.ram ? v.ram === c.ram : true) && (c.storage ? v.storage === c.storage : true));

  // Exact color+combo variant when it exists; otherwise fall back to the combo
  // (pricing follows RAM+ROM) and finally the color alone.
  const exact = variants.find((v) => v.color === selectedColor && matchesCombo(v, selectedCombo));
  const variant: Variant | null =
    exact ??
    variants.find((v) => matchesCombo(v, selectedCombo)) ??
    variants.find((v) => v.color === selectedColor) ??
    null;

  const gallery = useMemo(() => {
    const all = [...product.images, ...variants.map((v) => v.image).filter((i): i is string => Boolean(i))];
    return [...new Set(all)];
  }, [product.images, variants]);

  function selectColor(i: number) {
    setColorIdx(i);
    const img = colors[i]?.image;
    if (img) {
      const idx = gallery.indexOf(img);
      if (idx >= 0) setImageIdx(idx);
    }
  }

  const currentImage = gallery[imageIdx] ?? gallery[0];
  const comboAvailable = (c: RamRomCombo) =>
    variants.some((v) => matchesCombo(v, c) && v.inStock);
  const inStock =
    product.stockStatus === "in_stock" && (variant ? variant.inStock : true);

  const checkoutHref = variant
    ? `/checkout/${product.id}?variant=${encodeURIComponent(variant.id)}`
    : `/checkout/${product.id}`;

  return (
    <div className="space-y-10">
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Gallery */}
        <div className="space-y-3">
          <div className="relative aspect-square overflow-hidden rounded-2xl border border-stone-200 bg-stone-100">
            {currentImage ? (
              <Image
                src={currentImage}
                alt={`${product.brand} ${product.model}${selectedColor ? ` — ${selectedColor}` : ""}`}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-contain"
              />
            ) : (
              <div className="grid h-full place-items-center text-6xl text-stone-300">📱</div>
            )}
          </div>
          {gallery.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {gallery.map((img, i) => (
                <button
                  key={img}
                  type="button"
                  onClick={() => setImageIdx(i)}
                  aria-label={`View image ${i + 1}`}
                  className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 ${
                    i === imageIdx ? "border-brand" : "border-transparent"
                  }`}
                >
                  <Image src={img} alt="" fill sizes="64px" className="object-contain" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Purchase column */}
        <div className="space-y-5">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-brand">{product.brand}</p>
            <h1 className="mt-1 text-2xl font-extrabold text-ink sm:text-3xl">{product.model}</h1>
          </div>

          <PriceTag
            product={product}
            price={variant?.price ?? product.price}
            salePrice={variant?.salePrice ?? product.salePrice}
            size="lg"
          />

          <p
            className={`flex items-center gap-1.5 text-sm font-semibold ${
              inStock ? "text-emerald-600" : "text-stone-400"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${inStock ? "bg-emerald-500" : "bg-stone-400"}`} />
            {inStock ? "In Stock — ready to deliver" : "Out of Stock"}
          </p>

          {colors.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-bold text-ink">
                Color: <span className="font-medium text-stone-500">{selectedColor}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {colors.map((c, i) => (
                  <button
                    key={c.color}
                    type="button"
                    onClick={() => selectColor(i)}
                    aria-label={c.color}
                    aria-pressed={i === colorIdx}
                    title={c.color}
                    className={`h-9 w-9 rounded-full border-2 ${
                      i === colorIdx ? "border-brand ring-2 ring-brand/30" : "border-stone-300"
                    }`}
                    style={{ backgroundColor: c.colorHex ?? "#a8a29e" }}
                  />
                ))}
              </div>
            </div>
          )}

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
                      className={`rounded-xl border px-4 py-2 text-sm font-bold ${
                        active
                          ? "border-brand bg-teal-50 text-brand"
                          : available
                            ? "border-stone-200 bg-white text-ink hover:border-stone-300"
                            : "border-dashed border-stone-200 bg-stone-50 text-stone-400"
                      }`}
                    >
                      {c.label}
                      {!available && <span className="ml-1.5 text-[10px] font-semibold">(out of stock)</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {inStock ? (
            <Link
              href={checkoutHref}
              className="block w-full rounded-2xl bg-coral px-6 py-4 text-center text-lg font-extrabold text-white shadow-md transition-colors hover:bg-coral-dark"
            >
              Buy Now — Cash on Delivery
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
          <p className="text-center text-xs text-stone-400">
            No online payment — confirm your order on WhatsApp and pay on delivery.
          </p>
        </div>
      </div>

      <TrustBadges product={product} />

      <SpecBoxes
        specs={product.specs}
        overrides={
          isPhoneLike(product.category)
            ? {
                ram: selectedCombo?.ram ?? variant?.ram ?? null,
                storage: selectedCombo?.storage ?? variant?.storage ?? null,
              }
            : undefined
        }
      />
    </div>
  );
}
