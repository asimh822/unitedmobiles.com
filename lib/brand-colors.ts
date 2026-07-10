/**
 * Official-ish brand colors for the vertical brand labels, darkened where the
 * real brand color is too light to read on a white background.
 */
const BRAND_COLORS: Record<string, string> = {
  SAMSUNG: "#1428a0",
  VIVO: "#415fff",
  OPPO: "#067a46",
  REALME: "#d9a400", // realme yellow, darkened for contrast
  INFINIX: "#5e9e2e",
  TECNO: "#0c6cb5",
  MI: "#ff6900",
  XIAOMI: "#ff6900",
  ITEL: "#e2231a",
  HONOR: "#256fff",
  ZTE: "#005bac",
  NOKIA: "#124191",
  HMD: "#6aa338",
  APPLE: "#1c1917",
  GOOGLE: "#4285f4",
  ONEPLUS: "#eb0028",
};

const DEFAULT = "#1c4e9c"; // cobalt brand color for brands without a known color

export function brandColor(name: string): string {
  return BRAND_COLORS[name.trim().toUpperCase()] ?? DEFAULT;
}
