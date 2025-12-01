import {
  BaseDirectory,
  exists,
  mkdir,
  readDir,
  readTextFile,
} from "@tauri-apps/plugin-fs";
import { appLocalDataDir, resolve } from "@tauri-apps/api/path";
import { invoke } from "@tauri-apps/api/core";

/**
 * Fetch all analyses from the analyses directory
 */
export async function fetchAnalyses(): Promise<Analysis[]> {
  // Create directory if it doesn't exist
  const folderExists = await exists("analyses", {
    baseDir: BaseDirectory.AppLocalData,
  });

  if (!folderExists) {
    await mkdir("analyses", {
      baseDir: BaseDirectory.AppLocalData,
      recursive: true,
    });
    return [];
  }

  const files = await readDir("analyses", {
    baseDir: BaseDirectory.AppLocalData,
  });

  const analysisFiles = files.filter((f) => f.name.endsWith(".json"));

  const results = await Promise.all(
    analysisFiles.map(async (file) => {
      try {
        const contents = await readTextFile(`analyses/${file.name}`, {
          baseDir: BaseDirectory.AppLocalData,
        });

        const analysis = JSON.parse(contents) as Analysis;
        return analysis;
      } catch (error) {
        console.error(`Failed to load analysis from ${file.name}:`, error);
        return null;
      }
    })
  );

  // Filter out any failed loads and sort by creation date (newest first)
  const validAnalyses = results.filter((a): a is Analysis => a !== null);

  // Sort by creation date (newest first)
  validAnalyses.sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return dateB - dateA;
  });

  return validAnalyses;
}

/**
 * Save an analysis to a JSON file
 */
export async function saveAnalysis(analysis: Analysis): Promise<void> {
  await mkdir("analyses", {
    baseDir: BaseDirectory.AppLocalData,
    recursive: true,
  });

  // Use analysis ID as filename for consistency
  const fileName = `analysis-${analysis.id}.json`;
  const filePath = await resolve(await appLocalDataDir(), "analyses", fileName);

  const analysisToSave = JSON.stringify(analysis, null, 2);

  // Reuse the schema save command (it's just a generic file write)
  await invoke("save_schema", {
    schema: analysisToSave,
    filePath,
  });
}

/**
 * Delete an analysis file
 */
export async function deleteAnalysis(analysisId: number): Promise<void> {
  const fileName = `analysis-${analysisId}.json`;
  const filePath = await resolve(await appLocalDataDir(), "analyses", fileName);

  // Reuse the schema delete command (it's just a generic file delete)
  await invoke("delete_schema", { path: filePath });
}
