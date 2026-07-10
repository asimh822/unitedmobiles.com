import type { Product } from "@/lib/types";

function Badge({ children, tone }: { children: React.ReactNode; tone: "turq" | "gold" | "slate" }) {
  const tones = {
    turq: "bg-turq/10 text-turq-deep border-turq/30",
    gold: "bg-gold/10 text-gold-dark border-gold/30",
    slate: "bg-stone-100 text-stone-600 border-stone-200",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export default function TrustBadges({ product }: { product: Product }) {
  return (
    <div className="flex flex-wrap gap-2">
      {product.ptaApproved && <Badge tone="turq">✓ PTA Approved</Badge>}
      {product.warranty && <Badge tone="turq">🛡 {product.warranty}</Badge>}
      {/* Generic by design — never name a specific bank/vendor. */}
      <Badge tone="gold">💳 Easy Installments Available</Badge>
      <Badge tone="slate">{product.condition === "New" ? "Brand New" : "Pre-Owned"}</Badge>
    </div>
  );
}
