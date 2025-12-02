#!/usr/bin/env node

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");

const version = process.argv[2];

if (!version) {
  console.error("Usage: node set-numeric-version.js <version>");
  process.exit(1);
}

// Extract parts from version like "0.2026.3-beta"
const versionParts = version.split("-")[0].split("."); // Remove prerelease, split by dots
const major = versionParts[0];
const minor = versionParts[1];
const patch = versionParts[2] || "0";

let numericVersion;

// Check if minor version is > 255 (our year-based versioning)
if (parseInt(minor) > 255) {
  // Transform: "0.2026.3" -> "0.26.3"
  // Use last 2 digits of year
  const yearLastTwo = minor.slice(-2); // "2026" -> "26"
  numericVersion = `${major}.${yearLastTwo}.${patch}`;
} else {
  // Standard semver, just strip prerelease
  numericVersion = `${major}.${minor}.${patch}`;
}

console.log(`Setting numeric version: ${numericVersion} (from ${version})`);

// Update tauri.conf.json
const tauriConfPath = join(rootDir, "src-tauri", "tauri.conf.json");
const tauriConf = JSON.parse(readFileSync(tauriConfPath, "utf-8"));
const originalTauriVersion = tauriConf.version;

tauriConf.version = numericVersion;
writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + "\n");
console.log(
  `Updated tauri.conf.json: ${originalTauriVersion} -> ${numericVersion}`
);

// Update Cargo.toml
const cargoTomlPath = join(rootDir, "src-tauri", "Cargo.toml");
let cargoToml = readFileSync(cargoTomlPath, "utf-8");
const cargoVersionMatch = cargoToml.match(/^version\s*=\s*"([^"]+)"/m);

if (cargoVersionMatch) {
  const originalCargoVersion = cargoVersionMatch[1];
  cargoToml = cargoToml.replace(
    /^version\s*=\s*"[^"]+"/m,
    `version = "${numericVersion}"`
  );
  writeFileSync(cargoTomlPath, cargoToml);
  console.log(
    `Updated Cargo.toml: ${originalCargoVersion} -> ${numericVersion}`
  );
}

// Save original versions to a temp file so we can restore them later
const tempFile = join(rootDir, ".version-backup.json");
writeFileSync(
  tempFile,
  JSON.stringify(
    {
      tauriConf: originalTauriVersion,
      cargoToml: cargoVersionMatch
        ? cargoVersionMatch[1]
        : originalTauriVersion,
    },
    null,
    2
  )
);

console.log("Original versions saved for restoration");
console.log(`Windows-compatible version: ${numericVersion}`);
