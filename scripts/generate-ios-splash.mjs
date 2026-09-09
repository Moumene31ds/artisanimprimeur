// scripts/generate-ios-splash.mjs
// توليد شاشات إقلاع iOS (apple-touch-startup-image) بهوية المتجر.
// يعمل مرة واحدة: node scripts/generate-ios-splash.mjs
// الناتج: public/splash/apple-splash-{W}x{H}.png

import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "public", "splash");
const ICON = path.join(ROOT, "public", "icons", "icon-maskable-512x512.png");

// المقاسات الرسمية لأجهزة iPhone/iPad (عرض×ارتفاع بالبكسل الفعلي).
const SIZES = [
  { w: 1290, h: 2796 }, // iPhone 14/15/16 Pro Max
  { w: 1284, h: 2778 }, // iPhone 14 Plus / 13 / 12 Pro Max
  { w: 1242, h: 2688 }, // XS Max / 11 Pro Max
  { w: 1179, h: 2556 }, // iPhone 14/15/16 Pro
  { w: 1170, h: 2532 }, // iPhone 14 / 13 / 12
  { w: 1125, h: 2436 }, // X / XS / 11 Pro
  { w: 750, h: 1334 },  // SE (2nd/3rd) / 8
  { w: 2048, h: 2732 }, // iPad Pro 12.9"
  { w: 1668, h: 2388 }, // iPad Pro 11"
  { w: 1668, h: 2224 }, // iPad Air 10.5"
];

function splashSvg(w, h, iconR) {
  const cx = w / 2;
  const cy = h * 0.44;
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="bgTop" cx="18%" cy="10%" r="55%">
      <stop offset="0%" stop-color="#1e3a8a" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#0f172a" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="bgSide" cx="88%" cy="16%" r="50%">
      <stop offset="0%" stop-color="#581c87" stop-opacity="0.38"/>
      <stop offset="100%" stop-color="#0f172a" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#2563eb" stop-opacity="0.32"/>
      <stop offset="60%" stop-color="#2563eb" stop-opacity="0.10"/>
      <stop offset="100%" stop-color="#2563eb" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="#0f172a"/>
  <rect width="${w}" height="${h}" fill="url(#bgTop)"/>
  <rect width="${w}" height="${h}" fill="url(#bgSide)"/>
  <circle cx="${cx}" cy="${cy}" r="${iconR * 2.6}" fill="url(#glow)"/>
  <circle cx="${cx}" cy="${cy}" r="${iconR * 1.42}" fill="none" stroke="#3b82f6" stroke-opacity="0.22" stroke-width="${Math.max(1, Math.round(iconR * 0.02))}"/>
  <circle cx="${cx}" cy="${cy}" r="${iconR * 1.62}" fill="none" stroke="#3b82f6" stroke-opacity="0.10" stroke-width="${Math.max(1, Math.round(iconR * 0.015))}"/>
</svg>`;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  for (const { w, h } of SIZES) {
    const iconSize = Math.round(Math.min(w, h) * 0.17);
    const iconR = iconSize / 2;
    const cx = Math.round(w / 2);
    const cy = Math.round(h * 0.44);

    const iconBuf = await sharp(ICON)
      .resize(iconSize, iconSize)
      .png()
      .toBuffer();

    await sharp(Buffer.from(splashSvg(w, h, iconR)))
      .composite([
        {
          input: iconBuf,
          left: cx - Math.round(iconSize / 2),
          top: cy - Math.round(iconSize / 2),
        },
      ])
      .png({ compressionLevel: 9, palette: false })
      .toFile(path.join(OUT_DIR, `apple-splash-${w}x${h}.png`));

    console.log(`✓ apple-splash-${w}x${h}.png`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
