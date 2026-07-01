// Generates Android launcher icons from the brand SVGs into the mipmap
// folders created by `cap add android`. Uses the same `sharp` we use for
// PWA icons (no @capacitor/assets, whose sharp binary the proxy blocks).
import sharp from "sharp";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const resDir = resolve(root, "android/app/src/main/res");
if (!existsSync(resDir)) {
  console.error("android/ not found — run `npx cap add android` first.");
  process.exit(1);
}

const full = readFileSync(resolve(root, "assets/icon.svg"));
const fg = readFileSync(resolve(root, "assets/icon-foreground.svg"));

// Legacy launcher icon px per density; adaptive foreground canvas is 108dp.
const LAUNCHER = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
const FOREGROUND = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 };

async function circleMask(buf, size) {
  const mask = Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`,
  );
  return sharp(buf).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
}

for (const [dpi, size] of Object.entries(LAUNCHER)) {
  const dir = resolve(resDir, `mipmap-${dpi}`);
  const square = await sharp(full).resize(size, size).png().toBuffer();
  writeFileSync(resolve(dir, "ic_launcher.png"), square);
  writeFileSync(resolve(dir, "ic_launcher_round.png"), await circleMask(square, size));
  const fgSize = FOREGROUND[dpi];
  await sharp(fg).resize(fgSize, fgSize).png().toFile(resolve(dir, "ic_launcher_foreground.png"));
  console.log(`wrote mipmap-${dpi} (${size}px / fg ${fgSize}px)`);
}

// Adaptive-icon background → brand dark instead of white.
writeFileSync(
  resolve(resDir, "values/ic_launcher_background.xml"),
  `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#0A0E15</color>\n</resources>\n`,
);
console.log("set adaptive background to #0A0E15");
