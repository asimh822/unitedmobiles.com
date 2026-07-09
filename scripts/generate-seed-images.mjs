// Generates lightweight SVG placeholder art for every seed product variant.
// Usage: node scripts/generate-seed-images.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const products = JSON.parse(readFileSync(join(root, "lib", "seed-data.json"), "utf8"));
const outDir = join(root, "public", "seed");
mkdirSync(outDir, { recursive: true });

function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function phoneSvg(brand, model, color, hex) {
  const label = `${brand} ${model}`;
  const textFill = luminance(hex) > 0.6 ? "#1C1917" : "#FAFAF9";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f5f5f4"/>
      <stop offset="100%" stop-color="#e7e5e4"/>
    </linearGradient>
    <linearGradient id="screen" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0D9488" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="#134e4a"/>
    </linearGradient>
  </defs>
  <rect width="600" height="600" fill="url(#bg)"/>
  <rect x="185" y="60" width="230" height="480" rx="36" fill="${hex}"/>
  <rect x="185" y="60" width="230" height="480" rx="36" fill="none" stroke="rgba(0,0,0,0.15)" stroke-width="3"/>
  <rect x="199" y="74" width="202" height="452" rx="26" fill="url(#screen)"/>
  <circle cx="300" cy="96" r="7" fill="#1C1917" opacity="0.7"/>
  <rect x="238" y="250" width="124" height="14" rx="7" fill="#FAFAF9" opacity="0.9"/>
  <rect x="258" y="278" width="84" height="10" rx="5" fill="#FAFAF9" opacity="0.55"/>
  <circle cx="232" cy="130" r="14" fill="#FAFAF9" opacity="0.2"/>
  <text x="300" y="575" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="26" font-weight="600" fill="#1C1917">${label}</text>
  <text x="300" y="480" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="15" fill="${textFill}" opacity="0.85">${color}</text>
</svg>
`;
}

let count = 0;
for (const p of products) {
  for (const v of p.variants) {
    if (!v.image || !v.image.startsWith("/seed/")) continue;
    const file = join(outDir, v.image.replace("/seed/", ""));
    writeFileSync(file, phoneSvg(p.brand, p.model, v.color, v.colorHex ?? "#334155"));
    count++;
  }
}
console.log(`Wrote ${count} SVGs to public/seed`);
