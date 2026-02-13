import { invoke } from "@tauri-apps/api/core";
import { decodeQR, reconstructMatchDataFromArray } from "./QrUtils";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { getSchemaFromHash } from "./SchemaUtils";
import changelog from "../../CHANGELOG.md?raw";
import StoreManager, { StoreKeys } from "./StoreManager";

const GITHUB_OWNER = "TractorNation";
const GITHUB_REPO = "FarmHand";
const CACHE_DURATION = 3600000;

interface GitHubRelease {
  tag_name: string;
  prerelease: boolean;
  draft: boolean;
}

const typeMap: { [key: string]: string } = {
  checkbox: "c",
  counter: "n",
  dropdown: "d",
  text: "t",
  number: "N",
  slider: "s",
  timer: "T",
  grid: "g",
  filler: "f",
};

const propMap: { [key: string]: string } = {
  default: "d",
  options: "o",
  min: "m",
  max: "M",
  multiline: "l",
  selectsRange: "r",
  step: "s",
  rows: "R",
  cols: "C",
  cellLabel: "L",
};

//Commented out code in isFieldInvalid related to throwing error for not changing default value
export function isFieldInvalid(
  required: boolean,
  type: string,
  value: any
) {
  return (
    required &&
    (value === "" ||
      (type === "checkbox" && value === false) ||
      (type === "number" && (value === undefined || value === null )) ||
      (type === "grid" && (value as string).split(":")[1] === "[]")
    )
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

export async function exportQrCodesToCsv(
  qrCodes: QrCode[],
  availableSchemas: SchemaMetaData[]
) {
  if (qrCodes.length === 0) {
    throw new Error("No QR codes selected for export");
  }
  // Get schema from first QR code
  const firstDecoded = await decodeQR(qrCodes[0].data);
  console.log(firstDecoded);
  const schema = await getSchemaFromHash(
    firstDecoded.schemaHash,
    availableSchemas
  );
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

  const filename = `Farmhand-export-${Date.now()}.csv`;
  await saveFileWithDialog(csvData, filename);

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
  // Get schema from the first QR code to use as a reference.
  const firstDecoded = await decodeQR(qrCodes[0].data);
  if (!firstDecoded) {
    throw new Error("Could not decode the first QR code. Aborting export.");
  }

  const schema = await getSchemaFromHash(
    firstDecoded.schemaHash,
    availableSchemas
  );

  if (!schema) {
    throw new Error(
      `Schema with hash ${firstDecoded.schemaHash} not found. Cannot export.`
    );
  }

  const allFields = schema.sections.flatMap((section) => section.fields);

  const dataToExport = (
    await Promise.all(
      qrCodes.map(async (code) => {
        const decoded = await decodeQR(code.data);
        // Ensure the QR code is valid and matches the schema of the first code.
        if (!decoded || decoded.schemaHash !== firstDecoded.schemaHash) {
          return null;
        }

        const entry: { [key: string]: any } = {};
        allFields.forEach((field, index) => {
          if (decoded.data.length > index) {
            entry[field.name] = decoded.data[index];
          }
        });

        return Object.keys(entry).length > 0 ? entry : null;
      })
    )
  ).filter((item): item is { [key: string]: any } => item !== null);

  if (dataToExport.length === 0) {
    console.warn("No valid data to export for the selected schema.");
    return "";
  }

  const fileContent = JSON.stringify(dataToExport, null, 2);
  const filename = `Farmhand-Export-${Date.now()}.json`;

  await saveFileWithDialog(fileContent, filename);

  return filename;
}

export async function readChangelog(): Promise<string> {
  try {
    // Parse the changelog (improved version)
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

const reverseTypeMap = Object.fromEntries(
  Object.entries(typeMap).map(([k, v]) => [v, k])
);
const reversePropMap = Object.fromEntries(
  Object.entries(propMap).map(([k, v]) => [v, k])
);

export function minifySchema(schema: Schema): any[] {
  const minifiedSections = schema.sections.map((section) => {
    const minifiedFields = section.fields.map((field) => {
      const minifiedProps: { [key: string]: any } = {};

      if (field.props) {
        for (const key in field.props) {
          if (
            propMap[key] &&
            field.props[key as keyof ComponentProps] !== undefined
          ) {
            minifiedProps[propMap[key]] =
              field.props[key as keyof ComponentProps];
          }
        }
      }

      const fieldArray: any[] = [
        field.name,
        typeMap[field.type.toLowerCase()] || field.type,
        field.required ? 1 : 0,
      ];

      if (Object.keys(minifiedProps).length > 0) {
        fieldArray.push(minifiedProps);
      }

      return fieldArray;
    });
    return [section.title, minifiedFields];
  });

  return [schema.name, minifiedSections];
}

export function deminifySchema(minifiedSchema: any[]): Schema {
  const [name, minifiedSections] = minifiedSchema;

  const sections: SectionData[] = minifiedSections.map(
    (minifiedSection: any[], sectionIndex: number) => {
      const [title, minifiedFields] = minifiedSection;
      const fields: Component[] = minifiedFields.map(
        (minifiedField: any[], fieldIndex: number) => {
          const [fieldName, fieldTypeChar, requiredFlag, minifiedProps] =
            minifiedField;

          const props: { [key: string]: any } = {};
          if (minifiedProps) {
            for (const key in minifiedProps) {
              if (reversePropMap[key]) {
                props[reversePropMap[key]] = minifiedProps[key];
              }
            }
          }

          return {
            id: sectionIndex * 1000 + fieldIndex, // Regenerate ID
            name: fieldName,
            type: reverseTypeMap[fieldTypeChar] || fieldTypeChar,
            required: requiredFlag === 1,
            props: props,
          };
        }
      );

      return { title, fields };
    }
  );

  return { name, sections };
}

/**
 * Parse timer string to numeric seconds
 * Formats: "5.0" (5 seconds) or "2:30.0" (2 minutes 30 seconds)
 */
export function parseTime(timeString: string | undefined): number {
  if (!timeString || typeof timeString !== "string") {
    return 0;
  }
  if (timeString.includes(":")) {
    const parts = timeString.split(":");
    const minutes = parseInt(parts[0], 10) || 0;
    const seconds = parseFloat(parts[1]) || 0;
    return Math.round((minutes * 60 + seconds) * 10);
  }
  const seconds = parseFloat(timeString) || 0;
  return Math.round(seconds * 10);
}

/**
 * Extract numeric value from grid string format: "3x3:[1,2,3]"
 * Returns count of active cells
 */
export function parseGridToNumber(
  gridString: string | undefined | null
): number | null {
  if (!gridString || typeof gridString !== "string") {
    return null;
  }

  const match = gridString.match(/\[(.*)\]/);
  if (match && match[1]) {
    if (match[1].trim() === "") return 0;
    const indices = match[1]
      .split(",")
      .map((n) => parseInt(n.trim(), 10))
      .filter((n) => !isNaN(n));
    return indices.length;
  }
  return 0;
}

/**
 * Parse grid string format: "rowsxcols:[checked IDs]"
 * Returns object with dimensions and checked cell indices
 */
export function parseGridData(
  gridString: string | undefined | null
): { rows: number; cols: number; checkedIndices: number[] } | null {
  if (!gridString || typeof gridString !== "string") {
    return null;
  }

  // Extract dimensions: "3x3:[1,2,3]" -> rows=3, cols=3
  const dimMatch = gridString.match(/^(\d+)x(\d+):/);
  if (!dimMatch) return null;

  const rows = parseInt(dimMatch[1], 10);
  const cols = parseInt(dimMatch[2], 10);

  // Extract checked indices: "[1,2,3]" -> [1, 2, 3]
  const indicesMatch = gridString.match(/\[(.*)\]/);
  const checkedIndices: number[] = [];

  if (indicesMatch && indicesMatch[1]) {
    if (indicesMatch[1].trim() !== "") {
      const indices = indicesMatch[1]
        .split(",")
        .map((n) => parseInt(n.trim(), 10))
        .filter((n) => !isNaN(n));
      checkedIndices.push(...indices);
    }
  }

  return { rows, cols, checkedIndices };
}

/**
 * Convert cell index to coordinate string (e.g., 5 -> "1,2" for 3x3 grid)
 */
export function indexToCoordinate(index: number, cols: number): string {
  const row = Math.floor(index / cols);
  const col = index % cols;
  return `${row},${col}`;
}

export async function getLatestGitHubVersion(): Promise<string | null> {
  const now = Date.now();
  const cachedVersion = await StoreManager.get(StoreKeys.app.CACHED_VERSION);
  const lastCheck = await StoreManager.get(StoreKeys.app.LAST_VERSION_CHECK);

  if (cachedVersion && now - Number(lastCheck) < CACHE_DURATION) {
    console.log("Using cached version", cachedVersion);
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
