import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const version = process.argv[2];

if (!version) {
  console.error('Usage: node extract-changelog.js <version>');
  process.exit(1);
}

const changelogPath = join(__dirname, '..', 'CHANGELOG.md');
const changelogContent = readFileSync(changelogPath, 'utf-8');

// Normalize version - remove 'v' prefix if present and handle brackets
const normalizedVersion = version.replace(/^v/, '').trim();

// Find the version section
// Match both [version] and [vversion] formats
const versionPattern = new RegExp(
  `^## \\[${normalizedVersion.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`,
  'im'
);

const lines = changelogContent.split('\n');
let startIndex = -1;

// Find the starting line of the version section
for (let i = 0; i < lines.length; i++) {
  if (versionPattern.test(lines[i])) {
    startIndex = i;
    break;
  }
}

if (startIndex === -1) {
  // Try without brackets
  const versionPatternNoBrackets = new RegExp(
    `^## ${normalizedVersion.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
    'im'
  );
  for (let i = 0; i < lines.length; i++) {
    if (versionPatternNoBrackets.test(lines[i])) {
      startIndex = i;
      break;
    }
  }
}

if (startIndex === -1) {
  console.error(`Version ${version} not found in CHANGELOG.md`);
  process.exit(1);
}

// Find the next version section or end of file
let endIndex = lines.length;
for (let i = startIndex + 1; i < lines.length; i++) {
  if (lines[i].match(/^## \[/)) {
    endIndex = i;
    break;
  }
}

// Extract the changelog section
const changelogSection = lines.slice(startIndex, endIndex).join('\n').trim();

// If no content, return a default message
if (!changelogSection || changelogSection.split('\n').length <= 1) {
  console.log(`## Release ${normalizedVersion}\n\nSee CHANGELOG.md for details.`);
} else {
  console.log(changelogSection);
}

