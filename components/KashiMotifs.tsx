/**
 * Kashi-kari (Multan blue pottery) decorative motifs as lightweight inline
 * SVG — original geometric/floral paths in the style, no copied artwork.
 * Purely decorative: every element is aria-hidden.
 */

/**
 * Thin repeating "painted tile" border strip (~10px tall) — alternating
 * eight-petal florets and diamond dots over a shallow wave, like the band
 * along the rim of a glazed pot. Give each instance a unique `id`.
 */
export function KashiBorder({ id, className = "" }: { id: string; className?: string }) {
  return (
    <svg aria-hidden="true" className={`block h-2.5 w-full ${className}`} role="presentation">
      <defs>
        <pattern id={id} width="48" height="10" patternUnits="userSpaceOnUse">
          {/* wave baseline */}
          <path
            d="M0 7 Q6 4 12 7 T24 7 T36 7 T48 7"
            fill="none"
            stroke="var(--color-brand)"
            strokeWidth="1"
            opacity="0.55"
          />
          {/* floret: four petals around a turquoise heart */}
          <g transform="translate(12 4)">
            <circle r="1.1" fill="var(--color-turq)" />
            <circle cx="0" cy="-2.4" r="0.9" fill="var(--color-brand)" />
            <circle cx="0" cy="2.4" r="0.9" fill="var(--color-brand)" />
            <circle cx="-2.4" cy="0" r="0.9" fill="var(--color-brand)" />
            <circle cx="2.4" cy="0" r="0.9" fill="var(--color-brand)" />
          </g>
          {/* diamond dot between florets */}
          <rect
            x="34.6"
            y="2.6"
            width="2.8"
            height="2.8"
            transform="rotate(45 36 4)"
            fill="var(--color-gold)"
            opacity="0.8"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

/**
 * Large paisley/floral watermark for the hero — a boteh (paisley) outline
 * with an inner floral spray and trailing dots. Rendered in white; the
 * parent controls opacity (keep it 5–8% so text contrast is untouched).
 */
export function KashiWatermark({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 200 240"
      fill="none"
      className={className}
      role="presentation"
    >
      {/* boteh outline, curling tip */}
      <path
        d="M100 8C52 40 30 92 34 140c4 46 34 84 66 88 32-4 62-42 66-88 2.5-30-5-62-24-88 14 4 24 14 30 26-2-22-16-40-38-48C118 22 108 14 100 8Z"
        stroke="currentColor"
        strokeWidth="3"
      />
      {/* inner petal lattice */}
      <path
        d="M100 44c-28 22-42 54-39 84 3 30 20 54 39 58 19-4 36-28 39-58 3-30-11-62-39-84Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      {/* central flower */}
      <circle cx="100" cy="128" r="10" stroke="currentColor" strokeWidth="2" />
      <circle cx="100" cy="128" r="3" fill="currentColor" />
      {[0, 60, 120, 180, 240, 300].map((deg) => (
        <ellipse
          key={deg}
          cx="100"
          cy="106"
          rx="6"
          ry="13"
          stroke="currentColor"
          strokeWidth="2"
          transform={`rotate(${deg} 100 128)`}
        />
      ))}
      {/* trailing dots along the spine */}
      {[168, 184, 200].map((y, i) => (
        <circle key={y} cx="100" cy={y} r={3 - i * 0.7} fill="currentColor" />
      ))}
    </svg>
  );
}

/** Tiny diamond-and-dots flourish capping the vertical brand labels. */
export function KashiFlourish({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 14 8"
      className={`h-1.5 w-3.5 ${className}`}
      role="presentation"
    >
      <rect x="5.6" y="2.6" width="2.8" height="2.8" transform="rotate(45 7 4)" fill="currentColor" />
      <circle cx="1.5" cy="4" r="1" fill="currentColor" opacity="0.55" />
      <circle cx="12.5" cy="4" r="1" fill="currentColor" opacity="0.55" />
    </svg>
  );
}
