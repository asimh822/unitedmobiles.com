/**
 * Fallback for variant color dots when the admin didn't set an explicit hex:
 * guess a reasonable swatch color from the marketing color name.
 * Matches the last color word in the name (usually the noun — "Titanium Black"
 * is black, "Black Titanium" is titanium), preferring two-word phrases.
 */
const COLOR_WORDS: Record<string, string> = {
  // darks / metals
  black: "#1c1c1e",
  "jet black": "#0b0b0d",
  midnight: "#1d242e",
  graphite: "#41424c",
  onyx: "#23252b",
  obsidian: "#22242a",
  charcoal: "#36393f",
  slate: "#4b5563",
  titanium: "#8b8984",
  natural: "#b7ad9c",
  silver: "#d7d9dc",
  steel: "#9aa2ab",
  gray: "#8e9196",
  grey: "#8e9196",
  gunmetal: "#53595f",
  // lights
  white: "#f4f4f2",
  pearl: "#efeae2",
  starlight: "#efe5d8",
  cream: "#f2e8d5",
  ivory: "#f4efe1",
  beige: "#d9c9a8",
  sand: "#d6c29a",
  desert: "#cdb891",
  // warm
  gold: "#d4af6a",
  "rose gold": "#e0b7a4",
  bronze: "#b08d57",
  copper: "#b87333",
  brown: "#7b5b3f",
  mocha: "#8a6f5c",
  red: "#d32f2f",
  crimson: "#b0233a",
  maroon: "#7a2233",
  burgundy: "#6d1f2c",
  coral: "#f97316",
  orange: "#f97316",
  peach: "#f5b78f",
  amber: "#e8a33d",
  yellow: "#f2c94c",
  lemon: "#efd85f",
  // cool
  blue: "#2563eb",
  navy: "#1e3a5f",
  sapphire: "#1e4fa3",
  denim: "#3b5f8a",
  ocean: "#1f6f9e",
  sky: "#7fb6e0",
  ice: "#cfe3ee",
  cyan: "#22b8cf",
  aqua: "#3fc1c9",
  teal: "#0d9488",
  turquoise: "#2ec4b6",
  mint: "#9fdcc4",
  green: "#2f9e44",
  emerald: "#12766c",
  forest: "#2f5d3a",
  olive: "#6b8e23",
  lime: "#a3c14a",
  // purples / pinks
  purple: "#7c3aed",
  violet: "#8b5cf6",
  lavender: "#b8a6d9",
  lilac: "#c9b6e4",
  plum: "#8e4585",
  magenta: "#c2185b",
  pink: "#ec6f9c",
  rose: "#e3688c",
};

export function colorNameToHex(name: string): string | null {
  const words = name
    .toLowerCase()
    .replace(/[^a-z]+/g, " ")
    .split(" ")
    .filter(Boolean);
  for (let i = words.length - 1; i >= 0; i--) {
    if (i > 0) {
      const phrase = `${words[i - 1]} ${words[i]}`;
      if (COLOR_WORDS[phrase]) return COLOR_WORDS[phrase];
    }
    if (COLOR_WORDS[words[i]]) return COLOR_WORDS[words[i]];
  }
  return null;
}
