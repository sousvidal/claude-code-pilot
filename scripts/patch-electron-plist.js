#!/usr/bin/env node
// Patches the Electron dev binary's Info.plist so macOS shows "Clay" in the
// dock and menu bar instead of "Electron", and copies the app icon into the
// bundle so the dock shows the Clay logo. Runs automatically via postinstall.

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

if (process.platform !== "darwin") process.exit(0);

const electronApp = path.join(
  __dirname,
  "../node_modules/electron/dist/Electron.app",
);
const plist = path.join(electronApp, "Contents/Info.plist");
const resourcesDir = path.join(electronApp, "Contents/Resources");

try {
  execFileSync("/usr/libexec/PlistBuddy", ["-c", "Set :CFBundleName Clay", plist]);
  execFileSync("/usr/libexec/PlistBuddy", ["-c", "Set :CFBundleDisplayName Clay", plist]);
  console.log("Patched Electron.app bundle name → Clay");
} catch {
  console.warn("Could not patch Electron.app Info.plist — dock may show 'Electron'");
}

try {
  const src = path.join(__dirname, "../resources/icon.icns");
  const dest = path.join(resourcesDir, "Clay.icns");
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    execFileSync("/usr/libexec/PlistBuddy", [
      "-c", "Set :CFBundleIconFile Clay", plist,
    ]);
    console.log("Patched Electron.app icon → Clay.icns");
  }
} catch {
  console.warn("Could not patch Electron.app icon — dock may show default Electron icon");
}
