#!/usr/bin/env node

import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const backupFile = join(rootDir, '.version-backup.json');

if (!existsSync(backupFile)) {
  console.log('No version backup found, skipping restoration');
  process.exit(0);
}

const backup = JSON.parse(readFileSync(backupFile, 'utf-8'));

console.log('Restoring original versions...');

// Restore tauri.conf.json
const tauriConfPath = join(rootDir, 'src-tauri', 'tauri.conf.json');
const tauriConf = JSON.parse(readFileSync(tauriConfPath, 'utf-8'));
const currentTauriVersion = tauriConf.version;
tauriConf.version = backup.tauriConf;
writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + '\n');
console.log(`Restored tauri.conf.json: ${currentTauriVersion} -> ${backup.tauriConf}`);

// Restore Cargo.toml
const cargoTomlPath = join(rootDir, 'src-tauri', 'Cargo.toml');
let cargoToml = readFileSync(cargoTomlPath, 'utf-8');
const currentCargoMatch = cargoToml.match(/^version\s*=\s*"([^"]+)"/m);
const currentCargoVersion = currentCargoMatch ? currentCargoMatch[1] : 'unknown';

cargoToml = cargoToml.replace(
  /^version\s*=\s*"[^"]+"/m, 
  `version = "${backup.cargoToml}"`
);
writeFileSync(cargoTomlPath, cargoToml);
console.log(`Restored Cargo.toml: ${currentCargoVersion} -> ${backup.cargoToml}`);

// Clean up backup file
unlinkSync(backupFile);
console.log('Version restoration complete');