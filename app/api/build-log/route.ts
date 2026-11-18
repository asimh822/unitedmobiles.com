import { NextResponse } from "next/server";
import { COLORS, LENS_OPTIONS, MP_OPTIONS, PERSONAS, RAM_OPTIONS, STORAGE_OPTIONS } from "@/lib/build-match";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

/**
 * Anonymous build logging for /build (table build_logs, migration 007).
 * Stores only the build itself: no name, phone, IP or user agent.
 *
 *   { persona, build: {...}, est, picks: [uuid] }  → creates a row, returns { id }
 *   { id, whatsappPick: 0-2 }                      → marks a "Reserve on WhatsApp" tap
 *
 * The second form arrives by navigator.sendBeacon (text/plain), so the body is
 * read as text. Failures are swallowed: logging must never get in a buyer's way.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const inSet = (v: unknown, set: readonly number[]) => typeof v === "number" && set.includes(v);
const inRange = (v: unknown, lo: number, hi: number) => typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi;

export async function POST(req: Request) {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return new NextResponse(null, { status: 204 });

  let body: Record<string, unknown>;
  try {
    const text = await req.text();
    if (text.length > 2000) return NextResponse.json({ error: "too large" }, { status: 413 });
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const sb = getSupabaseAdmin();

  // WhatsApp tap on an existing log row. First tap only.
  if (typeof body.id === "string") {
    if (!UUID.test(body.id) || !inSet(body.whatsappPick, [0, 1, 2])) {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
    }
    await sb
      .from("build_logs")
      .update({ whatsapp_pick: body.whatsappPick, whatsapp_at: new Date().toISOString() })
      .eq("id", body.id)
      .is("whatsapp_pick", null);
    return new NextResponse(null, { status: 204 });
  }

  const b = (body.build ?? {}) as Record<string, unknown>;
  const picks = Array.isArray(body.picks) ? body.picks : [];
  const valid =
    PERSONAS.some((p) => p.id === body.persona) &&
    inRange(b.screen, 6.1, 6.9) &&
    inSet(b.ram, RAM_OPTIONS) &&
    inSet(b.storage, STORAGE_OPTIONS) &&
    inRange(b.battery, 4000, 7000) &&
    inSet(b.mp, MP_OPTIONS) &&
    inSet(b.lenses, LENS_OPTIONS) &&
    COLORS.some((c) => c[1] === b.color) &&
    inRange(body.est, 0, 1_000_000) &&
    picks.length <= 3 &&
    picks.every((x) => typeof x === "string" && UUID.test(x));
  if (!valid) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const { data, error } = await sb
    .from("build_logs")
    .insert({
      persona: body.persona,
      screen_in: b.screen,
      ram_gb: b.ram,
      storage_gb: b.storage,
      battery_mah: b.battery,
      main_cam_mp: b.mp,
      lens_count: b.lenses,
      color: COLORS.find((c) => c[1] === b.color)![0],
      est_price: Math.round(body.est as number),
      pick_ids: picks,
    })
    .select("id")
    .single();
  // Table missing (migration 007 not run yet) or any other failure: stay quiet.
  if (error || !data) return new NextResponse(null, { status: 204 });
  return NextResponse.json({ id: data.id });
}
