/**
 * Kashi-kari (Multan blue pottery) decorative motifs as lightweight inline
 * SVG — original geometric/floral paths in the style, no copied artwork.
 * Purely decorative: every element is aria-hidden.
 */

/**
 * Border band (20px): the painted rim of a Multani plate. A continuous
 * cobalt vine on a white glaze, between two cobalt rules, with a small
 * flower in every bend and turquoise leaves. One flowing line reads as
 * hand-painted pottery at any distance; the old row of tiny square tiles
 * read as a dotted line. Give each instance a unique `id`.
 */
export function KashiBorder({ id, className = "" }: { id: string; className?: string }) {
  const flower = (cx: number, cy: number) => (
    <g>
      {[0, 72, 144, 216, 288].map((deg) => (
        <ellipse
          key={deg}
          cx={cx}
          cy={cy - 2.7}
          rx="1.7"
          ry="2.5"
          fill="var(--color-brand)"
          transform={`rotate(${deg} ${cx} ${cy})`}
        />
      ))}
      <circle cx={cx} cy={cy} r="1.3" fill="var(--color-gold)" />
    </g>
  );
  const leaf = (cx: number, cy: number, deg: number) => (
    <ellipse cx={cx} cy={cy} rx="1.4" ry="3" fill="var(--color-turq)" transform={`rotate(${deg} ${cx} ${cy})`} />
  );
  return (
    <svg aria-hidden="true" className={`block h-5 w-full ${className}`} role="presentation">
      <defs>
        <pattern id={id} width="72" height="20" patternUnits="userSpaceOnUse">
          <rect width="72" height="20" fill="#fdfcf8" />
          <rect width="72" height="1.5" fill="var(--color-brand)" />
          <rect y="18.5" width="72" height="1.5" fill="var(--color-brand)" />
          {/* the vine: one S-curve per repeat, so the repeats join seamlessly */}
          <path
            d="M0 10C9 4 27 4 36 10S63 16 72 10"
            fill="none"
            stroke="var(--color-brand)"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
          {leaf(7, 5.4, 60)}
          {leaf(29, 5.4, -60)}
          {leaf(43, 14.6, -60)}
          {leaf(65, 14.6, 60)}
          {/* a flower inside each bend */}
          {flower(18, 11.6)}
          {flower(54, 8.6)}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

/**
 * The banner's one big motif: a round kashi tile (white glaze, cobalt
 * rim) with an eight-fold rosette, cobalt petals holding turquoise hearts,
 * turquoise petals between them and a gold centre. Original geometry in
 * the style of the shrine tiles, no copied artwork. Sized by the parent.
 */
export function KashiMedallion({ className = "" }: { className?: string }) {
  const big = "M100 82C84 68 84 42 100 26C116 42 116 68 100 82Z";
  const bigHeart = "M100 72C93 62 93 47 100 37C107 47 107 62 100 72Z";
  const small = "M100 80C91 70 91 56 100 47C109 56 109 70 100 80Z";
  const bud = "M100 30C95 25 95 18 100 13C105 18 105 25 100 30Z";
  return (
    <svg aria-hidden="true" viewBox="0 0 200 200" className={className} role="presentation">
      <circle cx="100" cy="100" r="97" fill="#fdfcf8" stroke="var(--color-brand)" strokeWidth="5" />
      <circle cx="100" cy="100" r="86" fill="none" stroke="var(--color-turq)" strokeWidth="1.5" />
      {Array.from({ length: 32 }, (_, i) => (
        <circle
          key={i}
          cx="100"
          cy="8.5"
          r="1.7"
          fill="var(--color-brand)"
          transform={`rotate(${i * 11.25} 100 100)`}
        />
      ))}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
        <g key={deg}>
          <path d={small} fill="var(--color-turq)" transform={`rotate(${deg + 22.5} 100 100)`} />
          <path d={bud} fill="var(--color-brand)" transform={`rotate(${deg + 22.5} 100 100)`} />
          <path d={big} fill="var(--color-brand)" transform={`rotate(${deg} 100 100)`} />
          <path d={bigHeart} fill="var(--color-turq)" transform={`rotate(${deg} 100 100)`} />
        </g>
      ))}
      <circle cx="100" cy="100" r="15" fill="#fdfcf8" stroke="var(--color-brand)" strokeWidth="3" />
      <circle cx="100" cy="100" r="8" fill="var(--color-gold)" />
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
