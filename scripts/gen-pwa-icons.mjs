// Rasterizes assets/icon.svg into the PWA PNG icons referenced by the
// web manifest. Maskable variant adds ~12% padding so platform masks
// don't clip the sandcrawler.
import sharp from "sharp";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const svg = readFileSync(resolve(root, "assets/icon.svg"));

async function render(size, out, { padded = false } = {}) {
  const target = resolve(root, "public", out);
  if (padded) {
    const inner = Math.round(size * 0.76);
    const buf = await sharp(svg).resize(inner, inner).png().toBuffer();
    await sharp({
      create: { width: size, height: size, channels: 4, background: "#0A0E15" },
    })
      .composite([{ input: buf, gravity: "center" }])
      .png()
      .toFile(target);
  } else {
    await sharp(svg).resize(size, size).png().toFile(target);
  }
  console.log("wrote", out);
}

await render(192, "pwa-192.png");
await render(512, "pwa-512.png");
await render(512, "maskable-512.png", { padded: true });
await render(180, "apple-touch-icon.png", { padded: true });
