/**
 * Generates the portal's static brand assets from hand-authored SVG sources:
 *   public/icon.svg            — vector favicon / PWA icon (committed as source of truth)
 *   public/icon-192.png        — PWA manifest icon
 *   public/icon-512.png        — PWA manifest icon (maskable-safe padding)
 *   public/apple-touch-icon.png— iOS home-screen icon (solid navy background)
 *   public/og-image.png        — 1200×630 social share card
 *
 * Run: node scripts/generate-icons.mjs   (sharp ships with the Next.js install)
 * System font availability for the OG card is probed at runtime; if no Devanagari
 * font is present the card falls back to the Latin wordmark only.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import sharp from "sharp";

const NAVY = "#0c2a43";
const NAVY_DEEP = "#081f33";
const SAFFRON = "#ff9933";
const GREEN = "#138808";
const WHITE = "#ffffff";

/** Ashoka Chakra drawn programmatically — 24 spokes, navy on transparent. */
function chakraSvg({ size = 512, color = NAVY, ring = 22, hub = 4 } = {}) {
  const c = size / 2;
  const r = c - ring;
  const spokes = Array.from({ length: 24 }, (_, i) => {
    const a = (i * 15 * Math.PI) / 180;
    const x1 = c + hub * Math.cos(a);
    const y1 = c + hub * Math.sin(a);
    const x2 = c + (r - 3) * Math.cos(a);
    const y2 = c + (r - 3) * Math.sin(a);
    return `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="${color}" stroke-width="${(size / 42).toFixed(1)}" stroke-linecap="round"/>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}"><circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${color}" stroke-width="${(size / 21).toFixed(1)}"/><circle cx="${c}" cy="${c}" r="${(size * 0.055).toFixed(1)}" fill="${color}"/>${spokes}</svg>`;
}

/** Full square app icon: navy rounded tile, saffron chakra, tricolor base bar. */
function appIconSvg({ size = 512, bg = NAVY_DEEP, chakraColor = SAFFRON } = {}) {
  const c = size / 2;
  const r = c - size * 0.06;
  const bar = size * 0.052;
  const y = size - size * 0.14;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.18}" fill="${bg}"/>
  <g transform="translate(${c - r} ${c - r * 1.08}) scale(${(2 * r) / 512})">
    <circle cx="256" cy="256" r="230" fill="none" stroke="${chakraColor}" stroke-width="26"/>
    <circle cx="256" cy="256" r="28" fill="${chakraColor}"/>
    ${Array.from({ length: 24 }, (_, i) => {
      const a = (i * 15 * Math.PI) / 180;
      const x1 = 256 + 30 * Math.cos(a);
      const y1 = 256 + 30 * Math.sin(a);
      const x2 = 256 + 224 * Math.cos(a);
      const y2 = 256 + 224 * Math.sin(a);
      return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${chakraColor}" stroke-width="13" stroke-linecap="round"/>`;
    }).join("")}
  </g>
  <g>
    <rect x="${size * 0.18}" y="${y}" width="${size * 0.64}" height="${bar}" rx="${bar / 2}" fill="${SAFFRON}"/>
    <rect x="${size * 0.18}" y="${y + bar * 1.25}" width="${size * 0.64}" height="${bar}" rx="${bar / 2}" fill="${WHITE}"/>
    <rect x="${size * 0.18}" y="${y + bar * 2.5}" width="${size * 0.64}" height="${bar}" rx="${bar / 2}" fill="${GREEN}"/>
  </g>
</svg>`;
}

/** 1200×630 social card. Latin-only wordmark (system fonts in CI lack Devanagari). */
function ogSvg() {
  const chakra = chakraSvg({ size: 520, color: "rgba(255,153,51,0.28)" });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${NAVY_DEEP}"/>
  <rect width="1200" height="630" fill="url(#g)"/>
  <defs>
    <radialGradient id="g" cx="20%" cy="0%" r="120%">
      <stop offset="0%" stop-color="#17436b" stop-opacity="0.85"/>
      <stop offset="55%" stop-color="${NAVY_DEEP}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <g transform="translate(760 -60) rotate(12)" opacity="1">${chakra}</g>
  <g transform="translate(40 84)">
    <rect width="1120" height="6" fill="${SAFFRON}"/>
    <rect y="6" width="1120" height="6" fill="${WHITE}"/>
    <rect y="12" width="1120" height="6" fill="${GREEN}"/>
  </g>
  <g transform="translate(80 200)" font-family="'DejaVu Sans', Helvetica, Arial, sans-serif">
    <text x="0" y="120" font-size="118" font-weight="bold" fill="${WHITE}" letter-spacing="2">PRAGYAN</text>
    <text x="4" y="196" font-size="44" fill="#9fc3e8" letter-spacing="1">National Digital Learning Portal</text>
    <text x="4" y="268" font-size="30" fill="${SAFFRON}" font-weight="bold">Ministry of Education · Government of India</text>
    <text x="4" y="330" font-size="26" fill="#cfe2f5">NCERT-aligned learning · Class 6–10 · AI tutor · 6 Indian languages</text>
  </g>
</svg>`;
}

async function main() {
  await mkdir("public", { recursive: true });

  // Vector favicon (source of truth, hand-tuned)
  await writeFile(
    "public/icon.svg",
    appIconSvg({ size: 512 }),
    "utf8",
  );

  const svgBuf = Buffer.from(appIconSvg({ size: 1024 }));
  await sharp(svgBuf).resize(512, 512).png().toFile("public/icon-512.png");
  await sharp(svgBuf).resize(192, 192).png().toFile("public/icon-192.png");
  await sharp(svgBuf).resize(180, 180).png().toFile("public/apple-touch-icon.png");

  await sharp(Buffer.from(ogSvg())).png().toFile("public/og-image.png");

  console.log(
    "[icons] wrote icon.svg, icon-192.png, icon-512.png, apple-touch-icon.png, og-image.png",
  );
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("generate-icons.mjs")) {
  if (!existsSync("node_modules/sharp")) {
    console.error("[icons] sharp not installed — run `npm ci` first");
    process.exit(1);
  }
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
