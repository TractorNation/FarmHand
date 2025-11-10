import { invoke } from "@tauri-apps/api/core";
import { decodeQR, reconstructMatchDataFromArray } from "./QrUtils";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";

export function isFieldInvalid(
  required: boolean,
  type: string,
  defaultValue: any,
  value: any
) {
  return (
    required &&
    (value === "" ||
      (type === "checkbox" && value === false) ||
      (type === "counter" && value === defaultValue))
  );
}

export function EmbedDataInSvg(code: QrCode) {
  let svgToSave = code.image;
  if (svgToSave && code.data) {
    const cdataPayload = `<![CDATA[${code.data}]]>`;
    const descRegex = /<desc>.*?<\/desc>/s;

    if (descRegex.test(svgToSave)) {
      svgToSave = svgToSave.replace(descRegex, `<desc>${cdataPayload}</desc>`);
    } else {
      const dataPayload = `<desc>${cdataPayload}</desc>`;
      const svgTagIndex = svgToSave.indexOf("<svg");
      if (svgTagIndex !== -1) {
        const endOfOpeningSvgTag = svgToSave.indexOf(">", svgTagIndex);
        if (endOfOpeningSvgTag !== -1) {
          svgToSave =
            svgToSave.slice(0, endOfOpeningSvgTag + 1) +
            dataPayload +
            svgToSave.slice(endOfOpeningSvgTag + 1);
        }
      }
    }
  }
  return svgToSave;
}

/**
 * Gets the <desc> tag from inside an SVG
 * @param contents the SVG to use
 * @returns the contents of the <desc> tag
 */
export function GetDescFromSvg(contents: string) {
  const match = contents.match(/<desc><!\[CDATA\[(.*?)\]\]><\/desc>/s);
  return match ? match[1] : "";
}

/**
 * Creates a unique hashed ID for a given schema
 * @param schema The schema to hash
 * @returns
 */
export async function createSchemaHash(schema: Schema): Promise<string> {
  const schemaHash = await invoke<string>("hash_schema", {
    schema: JSON.stringify(schema),
  });
  return schemaHash;
}

/**
 * Compresses JSON for embedding into a qr code
 * @param data JSON object to compress
 * @returns compressed string
 */
export async function compressData(data: any): Promise<string> {
  const json = JSON.stringify(data);
  return await invoke<string>("compress_fields", { fields: json });
}

/**
 * Decompress base64-encoded compressed string
 * @param encoded string to decompress
 * @returns the decompressed, encoded string
 */
export async function decompressData(encoded: string): Promise<any> {
  const json = await invoke<string>("decompress_data", { data: encoded });
  return JSON.parse(json);
}

/**
 * Gets a field from match data without using its ID, it then returns its ID.
 * @param fieldName name of field to get
 * @param schema current schema
 * @param matchData the data of the match
 * @returns the field without any special characters or spaces
 */
export function getFieldValueByName(
  fieldName: string,
  schema: Schema,
  matchData: Map<number, any>
): string | null {
  let fieldId;
  schema.sections.forEach((schema) => {
    schema.fields.find((f) => {
      if (f.name.toLowerCase().trim() === fieldName.toLowerCase().trim()) {
        fieldId = f.id;
      }
    });
  });
  if (!fieldId) return null;
  const value = matchData.get(fieldId);
  return value !== undefined
    ? String(value).replace(/[^a-zA-Z0-9_-]/g, "")
    : null;
}

export async function getSchemaFromHash(hash: string, availableSchemas: SchemaMetaData[]): Promise<Schema | null> {
  const allSchemasWithHash = await Promise.all(
    availableSchemas.map(async (s) => ({
      schema: s.schema,
      hash: await createSchemaHash(s.schema),
    }))
  );
  
  const found = allSchemasWithHash.find((s) => s.hash === hash);
  return found ? found.schema : null;
}

export function matchDataJsonToMap(object: any) {
  const map = new Map<number, any>();
  for (const key in object) {
    if (Object.prototype.hasOwnProperty.call(object, key)) {
      map.set(Number.parseInt(key), object[key]);
    }
  }

  return map;
}

export async function saveFileWithDialog(
  fileData: string,
  defaultName: string
) {
  const path = await save({
    defaultPath: defaultName,
    filters: [{ name: "CSV / JSON Files", extensions: ["csv", "json"] }],
  });

  if (path) {
    await writeTextFile(path, fileData);
    return path;
  } else {
    throw new Error("Save cancelled");
  }
}

export async function exportQrCodesToCsv(qrCodes: QrCode[], availableSchemas: SchemaMetaData[]) {
  if (qrCodes.length === 0) {
    throw new Error("No QR codes selected for export");
  }
  // Get schema from first QR code
  const firstDecoded = await decodeQR(qrCodes[0].data);
  console.log(firstDecoded);
  const schema = await getSchemaFromHash(firstDecoded.schemaHash, availableSchemas);
  if (!schema) {
    throw new Error(
      "Schema not found for QR codes, how did you manage this one"
    );
  }

  // Decode all QR strings and reconstruct data
  const decodedRecords = [];
  for (const code of qrCodes) {
    const decoded = await decodeQR(code.data);
    const record = reconstructMatchDataFromArray(schema, decoded.data);
    decodedRecords.push(record);
  }

  // Flatten schema into field order
  const fields: { id: number; name: string }[] = [];
  schema.sections.forEach((section) => {
    section.fields.forEach((f) => fields.push({ id: f.id, name: f.name }));
  });

  // Build CSV
  const header = fields.map((f) => f.name).join(",");
  const rows = decodedRecords.map((record) =>
    fields
      .map((f) => {
        const val = record[f.id];
        if (val === undefined || val === null) return "";
        if (typeof val === "string") {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      })
      .join(",")
  );

  const csvData = [header, ...rows].join("\n");

  // Save file using your existing Tauri invoke
  const filename = `Farmhand-export-${Date.now()}.csv`;
  await saveFileWithDialog(csvData, filename);

  return filename;
}
