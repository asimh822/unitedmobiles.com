import { mapProduct } from "@/lib/catalog";
import type { BuildCombo, BuildPhone } from "@/lib/build-match";
import { formatGb, productTitle } from "@/lib/format";
import { findDonor, isMatchable, parseGb, parseMatchFields, type MatchFields } from "@/lib/match-specs";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { cardImage, effectivePrice, formatConditionScore, type Product } from "@/lib/types";

/**
 * The shelf for /build: New Phones + Pre-Owned (EPOS) handsets, slimmed to
 * what the matcher needs. Migration-007 columns win when set; anything still
 * null is parsed from the spec sheet here (a Pre-Owned row has none, so it
 * borrows screen/battery/camera from the same model in New Phones).
 * KeyPad Phones and Tabs are left out: the builder is a 6.1-6.9" smartphone tool.
 */
export async function getBuildPhones(): Promise<BuildPhone[]> {
  if (!isSupabaseConfigured()) return [];

  // "*" picks up the 007 columns once they exist, and doesn't fail before.
  const { data, error } = await getSupabase()
    .from("products")
    .select("*, product_variants(*)")
    .in("category", ["New Phones", "Used"]);
  if (error || !data) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = data.map((row: any) => ({ row, p: mapProduct(row) }));
  const catalog = rows.filter((x) => x.p.category === "New Phones");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fieldsOf = (row: any, p: Product): MatchFields => {
    const parsed = parseMatchFields(p);
    const col = (v: unknown) => (v == null ? null : Number(v));
    return {
      screenIn: col(row.screen_in) ?? parsed.screenIn,
      batteryMah: col(row.battery_mah) ?? parsed.batteryMah,
      mainCamMp: col(row.main_cam_mp) ?? parsed.mainCamMp,
      lensCount: col(row.lens_count) ?? parsed.lensCount,
      ramGb: col(row.ram_gb) ?? parsed.ramGb,
      storageGb: col(row.storage_gb) ?? parsed.storageGb,
    };
  };

  const out: BuildPhone[] = [];
  for (const { row, p } of rows) {
    let f = fieldsOf(row, p);
    const preOwned = p.category === "Used";
    if (preOwned && (f.screenIn == null || f.batteryMah == null || f.mainCamMp == null)) {
      const donor = findDonor(p, catalog.map((c) => c.p));
      if (donor) {
        const d = fieldsOf(catalog.find((c) => c.p === donor)!.row, donor);
        f = {
          ...f,
          screenIn: f.screenIn ?? d.screenIn,
          batteryMah: f.batteryMah ?? d.batteryMah,
          mainCamMp: f.mainCamMp ?? d.mainCamMp,
          lensCount: f.lensCount ?? d.lensCount,
          // A handset's own RAM/storage only; never guess them from the donor.
        };
      }
    }
    if (!isMatchable(f, preOwned)) continue;

    const combos = combosOf(p, f);
    if (!combos.length) continue;

    const anyVariantInStock = p.variants.length === 0 || p.variants.some((v) => v.inStock);
    out.push({
      id: p.id,
      name: productTitle(p.brand, p.model),
      image: cardImage(p) ?? null,
      preOwned,
      condition: preOwned ? formatConditionScore(p.conditionScore) : null,
      inStock: p.stockStatus === "in_stock" && anyVariantInStock,
      screen: f.screenIn,
      battery: f.batteryMah,
      mp: f.mainCamMp,
      lenses: f.lensCount,
      combos,
    });
  }
  return out;
}

/** One entry per RAM+ROM combo at its lowest in-stock price (all variants if none in stock). */
function combosOf(p: Product, f: MatchFields): BuildCombo[] {
  if (p.variants.length === 0) {
    return [{ ram: f.ramGb, storage: f.storageGb, label: labelOf(f.ramGb, f.storageGb), price: effectivePrice(p) }];
  }
  const pool = p.variants.some((v) => v.inStock) ? p.variants.filter((v) => v.inStock) : p.variants;
  const byKey = new Map<string, BuildCombo>();
  for (const v of pool) {
    const ram = parseGb(v.ram) ?? f.ramGb;
    const storage = parseGb(v.storage) ?? f.storageGb;
    const price = effectivePrice(p, v);
    const key = `${ram}|${storage}`;
    const label =
      v.ram || v.storage
        ? [v.ram, v.storage].filter((x): x is string => Boolean(x)).map(formatGb).join(" + ")
        : labelOf(ram, storage);
    const had = byKey.get(key);
    if (!had || price < had.price) byKey.set(key, { ram, storage, label, price });
  }
  return [...byKey.values()].filter((c) => c.price > 0);
}

function labelOf(ram: number | null, storage: number | null): string | null {
  const gb = (n: number) => (n >= 1024 ? `${n / 1024}TB` : `${n}GB`);
  const parts = [ram != null ? gb(ram) : null, storage != null ? gb(storage) : null].filter(Boolean);
  return parts.length ? parts.join(" + ") : null;
}
