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

// Extract numeric-only version (strip prerelease identifiers)
// e.g., "0.2.0-beta.1" -> "0.2.0.1"
const numericVersion = version.replace(/-[a-z]+/g, "");

console.log(`Setting numeric version: ${numericVersion} (from ${version})`);

// Update tauri.conf.json
const tauriConfPath = join(rootDir, "src-tauri", "tauri.conf.json");
const tauriConf = JSON.parse(readFileSync(tauriConfPath, "utf-8"));
const originalVersion = tauriConf.version;

tauriConf.version = numericVersion;
writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + "\n");
console.log(`Updated tauri.conf.json: ${originalVersion} -> ${numericVersion}`);

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

// Save original version to a temp file so we can restore it later
const tempFile = join(rootDir, ".version-backup.json");
writeFileSync(
  tempFile,
  JSON.stringify({
    tauriConf: originalVersion,
    cargoToml: cargoVersionMatch ? cargoVersionMatch[1] : originalVersion,
  })
);

console.log("Original versions saved for restoration");
