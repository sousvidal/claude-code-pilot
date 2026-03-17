#!/usr/bin/env node
// Generates app icons from resources/icon.svg for all platforms.
//   macOS  → resources/icon.icns  (via iconutil)
//   Windows → resources/icon.ico  (via png-to-ico)
//   Linux  → resources/icon.png   (1024×1024)
//
// Prerequisites: npm i -D sharp png-to-ico
// Usage:        node scripts/generate-icons.js

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const sharp = require("sharp");

const ROOT = path.resolve(__dirname, "..");
const SVG = path.join(ROOT, "resources/icon.svg");
const RESOURCES = path.join(ROOT, "resources");

const ICONSET_SIZES = [16, 32, 48, 64, 128, 256, 512, 1024];

function buildIco(pngBuffers) {
  const count = pngBuffers.length;
  const headerSize = 6;
  const entrySize = 16;
  const dirSize = headerSize + entrySize * count;

  let dataOffset = dirSize;
  const entries = [];
  for (const png of pngBuffers) {
    entries.push({ offset: dataOffset, size: png.length });
    dataOffset += png.length;
  }

  const buf = Buffer.alloc(dataOffset);
  buf.writeUInt16LE(0, 0);
  buf.writeUInt16LE(1, 2);
  buf.writeUInt16LE(count, 4);

  for (let i = 0; i < count; i++) {
    const off = headerSize + i * entrySize;
    const dim = [16, 32, 48, 64, 128, 256][i] ?? 256;
    buf.writeUInt8(dim < 256 ? dim : 0, off);
    buf.writeUInt8(dim < 256 ? dim : 0, off + 1);
    buf.writeUInt8(0, off + 2);
    buf.writeUInt8(0, off + 3);
    buf.writeUInt16LE(1, off + 4);
    buf.writeUInt16LE(32, off + 6);
    buf.writeUInt32LE(entries[i].size, off + 8);
    buf.writeUInt32LE(entries[i].offset, off + 12);
    pngBuffers[i].copy(buf, entries[i].offset);
  }

  return buf;
}

async function main() {
  const svgBuffer = fs.readFileSync(SVG);

  // --- 1. Render SVG at high resolution, then resize to each target ---
  const hiRes = await sharp(svgBuffer, { density: 400 })
    .png()
    .toBuffer();

  const pngBuffers = new Map();
  for (const size of ICONSET_SIZES) {
    const buf = await sharp(hiRes)
      .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    pngBuffers.set(size, buf);
  }

  // --- 2. Linux icon (1024×1024 PNG) ---
  fs.writeFileSync(path.join(RESOURCES, "icon.png"), pngBuffers.get(1024));
  console.log("✓ resources/icon.png (1024×1024)");

  // --- 3. macOS .icns via iconutil ---
  if (process.platform === "darwin") {
    const iconsetDir = path.join(RESOURCES, "icon.iconset");
    fs.mkdirSync(iconsetDir, { recursive: true });

    const pairs = [
      [16, "icon_16x16.png"],
      [32, "icon_16x16@2x.png"],
      [32, "icon_32x32.png"],
      [64, "icon_32x32@2x.png"],
      [128, "icon_128x128.png"],
      [256, "icon_128x128@2x.png"],
      [256, "icon_256x256.png"],
      [512, "icon_256x256@2x.png"],
      [512, "icon_512x512.png"],
      [1024, "icon_512x512@2x.png"],
    ];

    for (const [size, name] of pairs) {
      fs.writeFileSync(path.join(iconsetDir, name), pngBuffers.get(size));
    }

    execSync(`iconutil -c icns -o "${path.join(RESOURCES, "icon.icns")}" "${iconsetDir}"`);
    fs.rmSync(iconsetDir, { recursive: true });
    console.log("✓ resources/icon.icns");
  }

  // --- 4. Windows .ico ---
  // --- 4. Windows .ico (manually assembled) ---
  const ICO_SIZES = [16, 32, 48, 64, 128, 256];
  const icoPngs = ICO_SIZES.map((s) => pngBuffers.get(s) ?? pngBuffers.get(64));
  const icoBuffer = buildIco(icoPngs);
  fs.writeFileSync(path.join(RESOURCES, "icon.ico"), icoBuffer);
  console.log("✓ resources/icon.ico");

  console.log("\nDone!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
