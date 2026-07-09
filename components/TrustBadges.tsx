import type { Product } from "@/lib/types";

function Badge({ children, tone }: { children: React.ReactNode; tone: "teal" | "coral" | "slate" }) {
  const tones = {
    teal: "bg-teal-50 text-brand border-teal-200",
    coral: "bg-orange-50 text-coral-dark border-orange-200",
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
      {product.ptaApproved && <Badge tone="teal">✓ PTA Approved</Badge>}
      {product.warranty && <Badge tone="teal">🛡 {product.warranty}</Badge>}
      {/* Generic by design — never name a specific bank/vendor. */}
      <Badge tone="coral">💳 Easy Installments Available</Badge>
      <Badge tone="slate">{product.condition === "New" ? "Brand New" : "Pre-Owned"}</Badge>
    </div>
  );
}
