"use client";

import Image from "next/image";
import { useRef, useState, useActionState } from "react";
import { saveProduct, type ActionState, type ProductPayload } from "@/app/admin/actions";
import {
  ACCESSORY_SUBCATEGORIES,
  CATEGORIES,
  SOUND_SUBCATEGORIES,
  isPhoneLike,
  type Category,
} from "@/lib/categories";
import type { Product, SpecGroup } from "@/lib/types";

const SPEC_CATEGORIES = ["Display", "Camera", "Memory", "Battery", "Connectivity", "General"];

const WARRANTY_PRESETS = [
  "1 Year Official Warranty",
  "6 Months Shop Warranty",
  "3 Months Shop Warranty",
  "No Warranty",
];

/** One click pre-fills the standard phone spec structure; empty rows are dropped on save. */
function specTemplate(ram: string, storage: string): SpecGroup[] {
  return [
    { category: "Display", items: [{ label: "Size", value: "" }, { label: "Type", value: "" }, { label: "Refresh Rate", value: "" }] },
    { category: "Camera", items: [{ label: "Main", value: "" }, { label: "Selfie", value: "" }] },
    { category: "Memory", items: [{ label: "RAM", value: ram }, { label: "Storage", value: storage }] },
    { category: "Battery", items: [{ label: "Capacity", value: "" }, { label: "Charging", value: "" }] },
    { category: "Connectivity", items: [{ label: "Network", value: "" }, { label: "SIM", value: "" }] },
  ];
}

interface VariantDraft {
  color: string;
  colorHex: string;
  storage: string;
  ram: string;
  price: string;
  salePrice: string;
  image: string;
  inStock: boolean;
}

const inputClass =
  "w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-ink focus:border-brand focus:outline-none";
const labelClass = "mb-1 block text-sm font-bold text-ink";

const NEW_BRAND = "__new__";

export default function ProductForm({
  product,
  brandNames = [],
}: {
  product?: Product;
  brandNames?: string[];
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveProduct, {});
  const fileRef = useRef<HTMLInputElement>(null);

  // Include the product's current brand even if it's missing from the list.
  const brandOptions =
    product?.brand && !brandNames.includes(product.brand)
      ? [product.brand, ...brandNames]
      : brandNames;
  const [newBrandMode, setNewBrandMode] = useState(brandOptions.length === 0);

  const [category, setCategory] = useState<Category>(product?.category ?? "New Phones");
  const [subcategory, setSubcategory] = useState(product?.subcategory ?? "");
  const [subSubcategory, setSubSubcategory] = useState(product?.subSubcategory ?? "");
  const [brand, setBrand] = useState(product?.brand ?? "");
  const [model, setModel] = useState(product?.model ?? "");
  const [price, setPrice] = useState(product ? String(product.price) : "");
  const [salePrice, setSalePrice] = useState(product?.salePrice ? String(product.salePrice) : "");
  const [saleActive, setSaleActive] = useState(product?.saleActive ?? false);
  const [ram, setRam] = useState(product?.ram ?? "");
  const [storage, setStorage] = useState(product?.storage ?? "");
  const [condition, setCondition] = useState<"New" | "Used">(product?.condition ?? "New");
  const [ptaApproved, setPtaApproved] = useState(product?.ptaApproved ?? true);
  const [warranty, setWarranty] = useState(product?.warranty ?? "");
  const [stockStatus, setStockStatus] = useState<"in_stock" | "out_of_stock">(
    product?.stockStatus ?? "in_stock",
  );
  const [existingImages, setExistingImages] = useState<string[]>(product?.images ?? []);
  const [specs, setSpecs] = useState<SpecGroup[]>(product?.specs ?? []);
  const [variants, setVariants] = useState<VariantDraft[]>(
    (product?.variants ?? []).map((v) => ({
      color: v.color,
      colorHex: v.colorHex ?? "",
      storage: v.storage ?? "",
      ram: v.ram ?? "",
      price: v.price != null ? String(v.price) : "",
      salePrice: v.salePrice != null ? String(v.salePrice) : "",
      image: v.image ?? "",
      inStock: v.inStock,
    })),
  );

  function buildPayload(): ProductPayload {
    const num = (s: string) => {
      const n = Number(s.replace(/[^0-9.]/g, ""));
      return Number.isFinite(n) && s.trim() !== "" ? n : null;
    };
    return {
      id: product?.id,
      brand,
      model,
      category,
      subcategory: category === "Accessories" ? subcategory || null : null,
      subSubcategory:
        category === "Accessories" && subcategory === "Sound" ? subSubcategory || null : null,
      price: num(price) ?? 0,
      salePrice: num(salePrice),
      saleActive,
      // Accessories carry no phone-style fields regardless of stale form state.
      ram: isPhoneLike(category) ? ram.trim() || null : null,
      storage: isPhoneLike(category) ? storage.trim() || null : null,
      condition: isPhoneLike(category) ? condition : "New",
      ptaApproved: isPhoneLike(category) ? ptaApproved : false,
      warranty: warranty.trim() || null,
      stockStatus,
      existingImages,
      specs: specs
        .map((g) => ({
          category: g.category.trim(),
          items: g.items.filter((i) => i.label.trim() && i.value.trim()),
        }))
        .filter((g) => g.category && g.items.length > 0),
      variants: variants
        .filter((v) => v.color.trim())
        .map((v) => ({
          color: v.color.trim(),
          colorHex: v.colorHex.trim() || null,
          storage: v.storage.trim() || null,
          ram: v.ram.trim() || null,
          price: num(v.price),
          salePrice: num(v.salePrice),
          image: v.image.trim() || null,
          inStock: v.inStock,
        })),
    };
  }

  function submit(formData: FormData) {
    formData.set("payload", JSON.stringify(buildPayload()));
    action(formData);
  }

  /* ---- specs helpers ---- */
  function updateSpecItem(gi: number, ii: number, key: "label" | "value", value: string) {
    setSpecs((prev) =>
      prev.map((g, i) =>
        i === gi
          ? { ...g, items: g.items.map((item, j) => (j === ii ? { ...item, [key]: value } : item)) }
          : g,
      ),
    );
  }

  const phoneLike = isPhoneLike(category);

  return (
    <form action={submit} className="max-w-3xl space-y-8">
      {/* Category */}
      <section className="grid gap-4 rounded-2xl border border-stone-200 bg-white p-5 sm:grid-cols-3">
        <div>
          <label className={labelClass}>Category *</label>
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value as Category);
              setSubcategory("");
              setSubSubcategory("");
            }}
            className={inputClass}
          >
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        {category === "Accessories" && (
          <div>
            <label className={labelClass}>Subcategory *</label>
            <select
              value={subcategory}
              onChange={(e) => {
                setSubcategory(e.target.value);
                setSubSubcategory("");
              }}
              className={inputClass}
            >
              <option value="">— select —</option>
              {ACCESSORY_SUBCATEGORIES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        )}
        {category === "Accessories" && subcategory === "Sound" && (
          <div>
            <label className={labelClass}>Sound Type *</label>
            <select
              value={subSubcategory}
              onChange={(e) => setSubSubcategory(e.target.value)}
              className={inputClass}
            >
              <option value="">— select —</option>
              {SOUND_SUBCATEGORIES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        )}
      </section>

      {/* Basics */}
      <section className="grid gap-4 rounded-2xl border border-stone-200 bg-white p-5 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Brand *</label>
          {newBrandMode ? (
            <div className="flex items-center gap-2">
              <input
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                required
                autoFocus
                className={inputClass}
                placeholder="New brand name"
              />
              {brandOptions.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setNewBrandMode(false);
                    setBrand(product?.brand ?? "");
                  }}
                  className="shrink-0 text-xs font-semibold text-stone-500 hover:text-ink"
                >
                  Cancel
                </button>
              )}
            </div>
          ) : (
            <select
              value={brand}
              onChange={(e) => {
                if (e.target.value === NEW_BRAND) {
                  setNewBrandMode(true);
                  setBrand("");
                } else {
                  setBrand(e.target.value);
                }
              }}
              required
              className={inputClass}
            >
              <option value="">— select brand —</option>
              {brandOptions.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
              <option value={NEW_BRAND}>+ Add new brand…</option>
            </select>
          )}
        </div>
        <div>
          <label className={labelClass}>Model *</label>
          <input value={model} onChange={(e) => setModel(e.target.value)} required className={inputClass} placeholder="Galaxy S24 Ultra" />
        </div>
        <div>
          <label className={labelClass}>Original Price (Rs.) *</label>
          <input value={price} onChange={(e) => setPrice(e.target.value)} required inputMode="numeric" className={inputClass} placeholder="389999" />
        </div>
        <div>
          <label className={labelClass}>Sale Price (Rs.)</label>
          <div className="flex items-center gap-3">
            <input value={salePrice} onChange={(e) => setSalePrice(e.target.value)} inputMode="numeric" className={inputClass} placeholder="364999" />
            <label className="flex shrink-0 items-center gap-2 text-sm font-semibold text-ink">
              <input type="checkbox" checked={saleActive} onChange={(e) => setSaleActive(e.target.checked)} className="h-4 w-4 accent-coral" />
              Sale on
            </label>
          </div>
        </div>
        {phoneLike && (
          <>
            <div>
              <label className={labelClass}>RAM</label>
              <input value={ram} onChange={(e) => setRam(e.target.value)} className={inputClass} placeholder="12GB" />
            </div>
            <div>
              <label className={labelClass}>Storage</label>
              <input value={storage} onChange={(e) => setStorage(e.target.value)} className={inputClass} placeholder="256GB" />
            </div>
            <div>
              <label className={labelClass}>Condition</label>
              <select value={condition} onChange={(e) => setCondition(e.target.value as "New" | "Used")} className={inputClass}>
                <option>New</option>
                <option>Used</option>
              </select>
            </div>
          </>
        )}
        <div>
          <label className={labelClass}>Stock Status</label>
          <select value={stockStatus} onChange={(e) => setStockStatus(e.target.value as "in_stock" | "out_of_stock")} className={inputClass}>
            <option value="in_stock">In Stock</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Warranty</label>
          <input value={warranty} onChange={(e) => setWarranty(e.target.value)} className={inputClass} placeholder="1 Year Official Warranty" list="warranty-presets" />
          <datalist id="warranty-presets">
            {WARRANTY_PRESETS.map((w) => (
              <option key={w} value={w} />
            ))}
          </datalist>
        </div>
        {phoneLike && (
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-ink">
              <input type="checkbox" checked={ptaApproved} onChange={(e) => setPtaApproved(e.target.checked)} className="h-4 w-4 accent-brand" />
              PTA Approved
            </label>
          </div>
        )}
      </section>

      {/* Images */}
      <section className="space-y-3 rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="font-extrabold text-ink">Images</h2>
        {existingImages.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {existingImages.map((img) => (
              <div key={img} className="relative">
                <div className="relative h-20 w-20 overflow-hidden rounded-xl border border-stone-200">
                  <Image src={img} alt="" fill sizes="80px" className="object-cover" />
                </div>
                <button
                  type="button"
                  onClick={() => setExistingImages((prev) => prev.filter((i) => i !== img))}
                  aria-label="Remove image"
                  className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-red-500 text-xs font-bold text-white"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        <input ref={fileRef} type="file" name="newImages" accept="image/*" multiple className="text-sm" />
        <p className="text-xs text-stone-400">New images upload to Supabase Storage on save.</p>
      </section>

      {/* Variants */}
      <section className="space-y-3 rounded-2xl border border-stone-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-extrabold text-ink">Color / Storage Variants</h2>
            <p className="text-xs text-stone-400">
              New rows copy the previous one — usually you only change the color or storage.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              setVariants((prev) => {
                // Prefill from the last variant (or the product's RAM/Storage)
                // so adding one more color/storage is a one-field edit.
                const last = prev[prev.length - 1];
                return [
                  ...prev,
                  last
                    ? { ...last, color: "", colorHex: "" }
                    : { color: "", colorHex: "", storage: storage.trim(), ram: ram.trim(), price: "", salePrice: "", image: "", inStock: true },
                ];
              })
            }
            className="text-sm font-bold text-brand hover:underline"
          >
            + Add variant
          </button>
        </div>
        {variants.length === 0 && (
          <p className="text-sm text-stone-400">No variants — the product sells as a single option.</p>
        )}
        {variants.map((v, i) => (
          <div key={i} className="grid gap-2 rounded-xl border border-stone-100 bg-stone-50 p-3 sm:grid-cols-4">
            <div className="flex items-center gap-2 sm:col-span-2">
              <input
                type="color"
                value={/^#[0-9a-fA-F]{6}$/.test(v.colorHex) ? v.colorHex : "#a8a29e"}
                onChange={(e) => setVariants((p) => p.map((x, j) => (j === i ? { ...x, colorHex: e.target.value } : x)))}
                title="Pick swatch color"
                className="h-9 w-11 shrink-0 cursor-pointer rounded-lg border border-stone-200 bg-white p-0.5"
              />
              <input value={v.color} onChange={(e) => setVariants((p) => p.map((x, j) => (j === i ? { ...x, color: e.target.value } : x)))} placeholder="Color name * (e.g. Midnight Black)" className={inputClass} />
            </div>
            <input value={v.ram} onChange={(e) => setVariants((p) => p.map((x, j) => (j === i ? { ...x, ram: e.target.value } : x)))} placeholder="RAM" className={inputClass} />
            <input value={v.storage} onChange={(e) => setVariants((p) => p.map((x, j) => (j === i ? { ...x, storage: e.target.value } : x)))} placeholder="Storage" className={inputClass} />
            <input value={v.price} onChange={(e) => setVariants((p) => p.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))} placeholder="Price (blank = base)" className={inputClass} />
            <input value={v.salePrice} onChange={(e) => setVariants((p) => p.map((x, j) => (j === i ? { ...x, salePrice: e.target.value } : x)))} placeholder="Sale price" className={inputClass} />
            <input value={v.image} onChange={(e) => setVariants((p) => p.map((x, j) => (j === i ? { ...x, image: e.target.value } : x)))} placeholder="Image URL (optional)" className={inputClass} />
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-ink">
                <input type="checkbox" checked={v.inStock} onChange={(e) => setVariants((p) => p.map((x, j) => (j === i ? { ...x, inStock: e.target.checked } : x)))} className="h-4 w-4 accent-brand" />
                In stock
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setVariants((p) => [...p.slice(0, i + 1), { ...v, color: "", colorHex: "" }, ...p.slice(i + 1)])}
                  className="text-sm font-semibold text-brand hover:underline"
                  title="Duplicate this row"
                >
                  Duplicate
                </button>
                <button type="button" onClick={() => setVariants((p) => p.filter((_, j) => j !== i))} className="text-sm font-semibold text-red-500 hover:underline">
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Specs */}
      <section className="space-y-3 rounded-2xl border border-stone-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-extrabold text-ink">Specs (grouped by category)</h2>
          <div className="flex gap-3">
            {specs.length === 0 && phoneLike && (
              <button
                type="button"
                onClick={() => setSpecs(specTemplate(ram.trim(), storage.trim()))}
                className="rounded-lg bg-teal-50 px-3 py-1 text-sm font-bold text-brand hover:bg-teal-100"
              >
                ⚡ Fill phone template
              </button>
            )}
            <button
              type="button"
              onClick={() =>
                setSpecs((prev) => [
                  ...prev,
                  {
                    category: SPEC_CATEGORIES.find((c) => !prev.some((g) => g.category === c)) ?? "General",
                    items: [{ label: "", value: "" }],
                  },
                ])
              }
              className="text-sm font-bold text-brand hover:underline"
            >
              + Add category
            </button>
          </div>
        </div>
        {specs.map((group, gi) => (
          <div key={gi} className="space-y-2 rounded-xl border border-stone-100 bg-stone-50 p-3">
            <div className="flex items-center gap-2">
              <input
                value={group.category}
                onChange={(e) => setSpecs((p) => p.map((g, i) => (i === gi ? { ...g, category: e.target.value } : g)))}
                list="spec-categories"
                placeholder="Category (e.g. Display)"
                className={`${inputClass} font-bold`}
              />
              <button type="button" onClick={() => setSpecs((p) => p.filter((_, i) => i !== gi))} className="shrink-0 text-sm font-semibold text-red-500 hover:underline">
                Remove
              </button>
            </div>
            {group.items.map((item, ii) => (
              <div key={ii} className="flex gap-2">
                <input value={item.label} onChange={(e) => updateSpecItem(gi, ii, "label", e.target.value)} placeholder="Label (e.g. Size)" className={inputClass} />
                <input value={item.value} onChange={(e) => updateSpecItem(gi, ii, "value", e.target.value)} placeholder={'Value (e.g. 6.8" QHD+)'} className={inputClass} />
                <button
                  type="button"
                  onClick={() => setSpecs((p) => p.map((g, i) => (i === gi ? { ...g, items: g.items.filter((_, j) => j !== ii) } : g)))}
                  aria-label="Remove spec"
                  className="shrink-0 text-red-500"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setSpecs((p) => p.map((g, i) => (i === gi ? { ...g, items: [...g.items, { label: "", value: "" }] } : g)))}
              className="text-sm font-semibold text-brand hover:underline"
            >
              + Add spec
            </button>
          </div>
        ))}
        <datalist id="spec-categories">
          {SPEC_CATEGORIES.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </section>

      {state.error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-600">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-2xl bg-coral px-6 py-4 text-base font-extrabold text-white hover:bg-coral-dark disabled:opacity-60 sm:w-auto sm:px-12"
      >
        {pending ? "Saving…" : product ? "Save Changes" : "Create Product"}
      </button>
    </form>
  );
}
