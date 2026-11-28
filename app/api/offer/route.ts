import { NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

/**
 * Anonymous offer logging for EPOS phones (table offers, migration 009).
 *
 *   { productId, eposRef, name, asking, kind: 'best_price' }
 *   { productId, eposRef, name, asking, kind: 'offer', amount }
 *
 * Arrives by navigator.sendBeacon (text/plain) right before WhatsApp opens,
 * so the body is read as text. There is NO price floor on purpose: any offer
 * is a conversation to have on WhatsApp. Failures are swallowed: logging must
 * never get in a buyer's way.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REF = /^(used|kit)-\d{1,9}$/;
const money = (v: unknown) => typeof v === "number" && Number.isFinite(v) && v > 0 && v <= 10_000_000;

export async function POST(req: Request) {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return new NextResponse(null, { status: 204 });

  let b: Record<string, unknown>;
  try {
    const text = await req.text();
    if (text.length > 1000) return NextResponse.json({ error: "too large" }, { status: 413 });
    b = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const kind = b.kind;
  const valid =
    (kind === "best_price" || (kind === "offer" && money(b.amount))) &&
    typeof b.productId === "string" && UUID.test(b.productId) &&
    (b.eposRef == null || (typeof b.eposRef === "string" && REF.test(b.eposRef))) &&
    typeof b.name === "string" && b.name.length > 0 && b.name.length <= 120 &&
    money(b.asking);
  if (!valid) return NextResponse.json({ error: "invalid" }, { status: 400 });

  // Table missing (migration 009 not run yet) or any other failure: stay quiet.
  await getSupabaseAdmin()
    .from("offers")
    .insert({
      product_id: b.productId,
      epos_ref: b.eposRef ?? null,
      product_name: b.name,
      asking_price: Math.round(b.asking as number),
      kind,
      offer_amount: kind === "offer" ? Math.round(b.amount as number) : null,
    });
  return new NextResponse(null, { status: 204 });
}
