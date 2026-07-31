import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import {
  decodeQR,
  getSchemaHashFromQrString,
  reconstructMatchDataFromArray,
} from "./QrUtils";
import { buildJsonRecord, planMatchExport, toCsv } from "./ExportPlan";
import { getSchemaFromHash } from "./SchemaUtils";

/**
 * CSV/JSON export of saved match codes.
 *
 * This module is deliberately a leaf: it imports `QrUtils`, and nothing in `QrUtils`
 * imports it back. Keeping it separate is what breaks the import cycle that existed
 * while this lived in `GeneralUtils` alongside helpers `QrUtils` needed.
 *
 * The published column contract lives in docs/WIRE_FORMAT.md §8.
 */

/** Save-dialog filters keyed by file extension. */
const SAVE_FILTERS: Record<string, { name: string; extensions: string[] }> = {
  csv: { name: "CSV File", extensions: ["csv"] },
  json: { name: "JSON File", extensions: ["json"] },
  svg: { name: "SVG Image", extensions: ["svg"] },
};

/**
 * Saves text through the native save dialog.
 *
 * The filter is derived from `defaultName`'s extension rather than passed in: every
 * caller already supplies a correctly-suffixed name, so deriving it removes the
 * chance of a caller and its filter disagreeing.
 */
export async function saveFileWithDialog(
  fileData: string,
  defaultName: string
) {
  const extension = defaultName.split(".").pop()?.toLowerCase() ?? "";
  const filter = SAVE_FILTERS[extension];

  const path = await save({
    defaultPath: defaultName,
    filters: filter ? [filter] : undefined,
  });

  if (path) {
    await writeTextFile(path, fileData);
    return path;
  } else {
    throw new Error("Save cancelled");
  }
}

/**
 * Resolves the schema a set of codes was recorded with.
 *
 * Reads the hash straight off the QR string rather than decoding first — a match
 * payload cannot be decoded until the schema is known.
 */
async function resolveExportSchema(
  qrCodes: QrCode[],
  availableSchemas: SchemaMetaData[]
): Promise<{ schema: Schema; schemaHash: string }> {
  if (qrCodes.length === 0) {
    throw new Error("No QR codes selected for export");
  }

  const schemaHash = getSchemaHashFromQrString(qrCodes[0].data);
  if (!schemaHash) {
    throw new Error("The selected QR code is not a FarmHand code");
  }

  const schema = await getSchemaFromHash(schemaHash, availableSchemas);
  if (!schema) {
    throw new Error(
      `No schema on this device matches hash ${schemaHash}. Import the schema QR code first.`
    );
  }

  return { schema, schemaHash };
}

export async function exportQrCodesToCsv(
  qrCodes: QrCode[],
  availableSchemas: SchemaMetaData[]
) {
  const { schema, schemaHash } = await resolveExportSchema(
    qrCodes,
    availableSchemas
  );

  const plan = planMatchExport(schema);

  const rows: any[][] = [];
  for (const code of qrCodes) {
    // Skip codes from a different schema rather than writing misaligned columns.
    if (getSchemaHashFromQrString(code.data) !== schemaHash) continue;
    const decoded = await decodeQR(code.data, schema);
    rows.push(plan.extract(reconstructMatchDataFromArray(schema, decoded.data)));
  }

  if (rows.length === 0) {
    throw new Error("None of the selected codes could be decoded for export");
  }

  const filename = `Farmhand-export-${Date.now()}.csv`;
  await saveFileWithDialog(toCsv(plan.headers, rows), filename);

  return filename;
}

/**
 * Saves a set of qr codes into a JSON file based on their schema
 *
 * @param qrCodes An array of Qr codes
 * @param availableSchemas An array of all available schemas
 * @returns The filename of the saved file
 */
export async function exportQrCodesToJson(
  qrCodes: QrCode[],
  availableSchemas: SchemaMetaData[]
): Promise<string> {
  const { schema, schemaHash } = await resolveExportSchema(
    qrCodes,
    availableSchemas
  );

  const dataToExport = (
    await Promise.all(
      qrCodes.map(async (code) => {
        // Only export codes recorded with this schema; a mixed set would produce
        // records whose field names do not describe their values.
        if (getSchemaHashFromQrString(code.data) !== schemaHash) return null;
        const decoded = await decodeQR(code.data, schema);
        return buildJsonRecord(
          schema,
          reconstructMatchDataFromArray(schema, decoded.data)
        );
      })
    )
  ).filter((item): item is Record<string, any> => item !== null);

  if (dataToExport.length === 0) {
    throw new Error("None of the selected codes could be decoded for export");
  }

  const fileContent = JSON.stringify(dataToExport, null, 2);
  const filename = `Farmhand-Export-${Date.now()}.json`;

  await saveFileWithDialog(fileContent, filename);

  return filename;
}
