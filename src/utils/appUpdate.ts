import changelog from "../../CHANGELOG.md?raw";
import StoreManager, { StoreKeys } from "./StoreManager";

/**
 * Changelog and release-version lookups.
 *
 * Isolated so the `CHANGELOG.md?raw` import stays here rather than pulling the whole
 * changelog text into the dependency graph of every file that wants an unrelated
 * helper. Only `app.tsx` and `Help.tsx` need this.
 */

const GITHUB_OWNER = "TractorNation";
const GITHUB_REPO = "FarmHand";
const CACHE_DURATION = 3600000;

interface GitHubRelease {
  tag_name: string;
  prerelease: boolean;
  draft: boolean;
}

/** Returns the most recent entry from CHANGELOG.md. */
export async function readChangelog(): Promise<string> {
  try {
    const lines = changelog.split("\n");
    let latestEntry = "";
    let foundEntry = false;
    let entryStartFound = false;

    for (const line of lines) {
      if (line.startsWith("## ")) {
        if (foundEntry) break; // Stop after the first entry
        foundEntry = true;
        entryStartFound = true;
        latestEntry += line + "\n";
      } else if (entryStartFound) {
        latestEntry += line + "\n";
      }
    }

    return latestEntry.trim();
  } catch (e) {
    console.error("Failed to read changelog:", e);
    return "Error reading changelog.";
  }
}

export async function getLatestGitHubVersion(): Promise<string | null> {
  const now = Date.now();
  const cachedVersion = await StoreManager.get(StoreKeys.app.CACHED_VERSION);
  const lastCheck = await StoreManager.get(StoreKeys.app.LAST_VERSION_CHECK);

  if (cachedVersion && now - Number(lastCheck) < CACHE_DURATION) {
    return cachedVersion;
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases`,
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (!response.ok) {
      console.error("Failed to fetch releases from GitHub");
      return null;
    }

    const releases: GitHubRelease[] = await response.json();

    // Filter out drafts and get the first release (latest)
    const latestRelease = releases.find((release) => !release.draft);

    if (!latestRelease) {
      console.error("No releases found");
      return null;
    }

    // Remove 'v' prefix if present (e.g., "v0.2.0-beta.1" -> "0.2.0-beta.1")
    const version = latestRelease.tag_name.replace(/^v/, "");
    StoreManager.set(StoreKeys.app.CACHED_VERSION, version);
    StoreManager.set(StoreKeys.app.LAST_VERSION_CHECK, now.toString());
    return version;
  } catch (error) {
    console.error("Error checking for updates:", error);
    return null;
  }
}
