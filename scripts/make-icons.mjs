/**
 * Build the site favicon from the shop logo.
 *
 * The logo is a wide lockup (phone mark + "UNITED" + ملتان) — unreadable at the
 * 16px a browser tab actually renders. So we take just the mark, the way
 * Google/LinkedIn use their glyph rather than their wordmark, and centre it on
 * the logo's own charcoal ground.
 */
import sharp from "sharp";
import { writeFileSync } from "node:fs";

const SRC = "public/shop-logo.png";
/** Crimson phone mark inside the lockup, measured off the pixels. */
const MARK = { left: 35, top: 41, width: 156, height: 286 };
/** The logo's charcoal background, sampled from its top-left pixel. */
const BG = { r: 57, g: 60, b: 65, alpha: 1 };
/**
 * Share of the canvas height the mark fills. The mark is tall and narrow, so a
 * conservative fill leaves it a thin sliver in a square tab icon — push it
 * close to the edges or it turns to mush at 16px.
 */
const FILL = 0.9;

async function square(size) {
  const markH = Math.round(size * FILL);
  const markW = Math.round((markH * MARK.width) / MARK.height);
  const mark = await sharp(SRC)
    .extract(MARK)
    .resize(markW, markH, { fit: "fill" })
    .toBuffer();

  return sharp({
    create: { width: size, height: size, channels: 4, background: BG },
  })
    .composite([{ input: mark, gravity: "center" }])
    .png()
    .toBuffer();
}

/**
 * Pack PNGs into a multi-size ICO (PNG-in-ICO, Vista+). Each size is rendered
 * from the full-resolution mark rather than downscaled from one frame — a
 * browser shrinking 32→16 smears strokes this thin.
 */
function ico(frames) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(frames.length, 4);

  let offset = header.length + frames.length * 16;
  const dir = [];
  for (const { size, png } of frames) {
    const entry = Buffer.alloc(16);
    entry[0] = size === 256 ? 0 : size; // width  (0 means 256)
    entry[1] = size === 256 ? 0 : size; // height
    entry[2] = 0; // palette
    entry[3] = 0; // reserved
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    dir.push(entry);
    offset += png.length;
  }
  return Buffer.concat([header, ...dir, ...frames.map((f) => f.png)]);
}

writeFileSync("app/icon.png", await square(512));
writeFileSync("app/apple-icon.png", await square(180));

// Largest first: Next advertises the ICO's first entry in `sizes`, and a
// browser that sees 16x16 there prefers to downscale the 512 PNG instead of
// using the frames we rendered for exactly this.
const frames = [];
for (const size of [48, 32, 16]) frames.push({ size, png: await square(size) });
writeFileSync("app/favicon.ico", ico(frames));

// Small renders to eyeball what a tab actually shows.
if (process.env.OUT) {
  for (const { size, png } of frames) writeFileSync(`${process.env.OUT}/preview-${size}.png`, png);
}
console.log("wrote app/icon.png, app/apple-icon.png, app/favicon.ico");
