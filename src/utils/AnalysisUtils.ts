import { orderedFields } from "./schemaFields";
import {
  BaseDirectory,
  exists,
  mkdir,
  readDir,
  readTextFile,
} from "@tauri-apps/plugin-fs";
import { appLocalDataDir, resolve } from "@tauri-apps/api/path";
import { invoke } from "@tauri-apps/api/core";
import {
  DecodedQr,
  decodeQR,
  getSchemaHashFromQrString,
} from "./QrUtils";

/**
 * Fetch all analyses from the analyses directory
 */
/** One decoded QR paired with its source, as the chart pipeline consumes it. */
export interface AnalysisDataItem {
  qr: QrCode;
  decoded: DecodedQr;
}

/**
 * Selects and decodes the QR codes an analysis covers.
 *
 * Codes are filtered by schema hash *before* decoding: a bit-packed payload can only be
 * decoded with the schema it was recorded against.
 */
export async function filterQrCodesForAnalysis(
  qrCodes: QrCode[],
  analysis: Pick<Analysis, "schemaHash" | "selectedTeams" | "selectedMatches">,
  schema: Schema
): Promise<AnalysisDataItem[]> {
  const allFields = orderedFields(schema);
  const matchNumberIndex = allFields.findIndex((f) => f.name === "Match Number");
  const teamNumberIndex = allFields.findIndex((f) => f.name === "Team Number");

  const decoded = await Promise.all(
    qrCodes
      .filter((qr) => !qr.archived)
      .map(async (qr) => {
        try {
          if (getSchemaHashFromQrString(qr.data) !== analysis.schemaHash) {
            return null;
          }
          return { qr, decoded: await decodeQR(qr.data, schema) };
        } catch {
          return null;
        }
      })
  );

  return decoded.filter((item): item is AnalysisDataItem => {
    if (!item || !item.decoded || !item.decoded.data) return false;

    // An empty selection means "no filter", not "match nothing".
    if (analysis.selectedTeams.length > 0) {
      // Without a Team Number field there is no way to honour a team filter, so
      // excluding is the safe reading.
      if (teamNumberIndex === -1) return false;
      const teamField = item.decoded.data[teamNumberIndex];
      if (teamField === undefined || teamField === null) return false;
      const teamNum = Number(teamField);
      if (isNaN(teamNum) || !analysis.selectedTeams.includes(teamNum)) {
        return false;
      }
    }

    if (analysis.selectedMatches.length > 0) {
      if (matchNumberIndex === -1) return false;
      const matchField = item.decoded.data[matchNumberIndex];
      if (matchField === undefined || matchField === null) return false;
      if (!analysis.selectedMatches.includes(String(matchField))) return false;
    }

    return true;
  });
}

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


