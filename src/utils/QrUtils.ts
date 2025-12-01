import { invoke } from "@tauri-apps/api/core";
import {
  compressData,
  createSchemaHash,
  decompressData,
  deminifySchema,
  EmbedDataInSvg,
  GetDescFromSvg,
  getFieldValueByName,
  matchDataJsonToMap,
  minifySchema,
} from "./GeneralUtils";
import { appLocalDataDir, resolve } from "@tauri-apps/api/path";
import {
  BaseDirectory,
  exists,
  mkdir,
  readDir,
  readTextFile,
} from "@tauri-apps/plugin-fs";
import StoreManager from "./StoreManager";

export type QrType = "match" | "schema" | "theme" | "settings";
export type EncodedQr = string;

export interface DecodedQr {
  deviceId: number;
  type: QrType;
  schemaHash: string;
  data: any;
}

type FieldValue = string | number | boolean | null;

const APP_PREFIX = "frmhnd";

/**
 * Builder tool for qr codes, will eventually include all types and other helpful build functions
 */
export const QrCodeBuilder = {
  buildFileName: (qrNameInfo: string[]) => generateQrFileName(qrNameInfo),
  build: {
    MATCH: async (
      schemaHash: string,
      payload: any,
      qrNameInfo: string[],
      deviceId: number
    ) =>
      await writeDataToQrCode(
        "match",
        schemaHash,
        payload,
        qrNameInfo,
        deviceId
      ),
    SCHEMA: async (schema: Schema) => {
      const schemaHash = await createSchemaHash(schema);
      const fileName = `Schema_${schema.name.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
      const minifiedSchema = minifySchema(schema);
      return await writeDataToQrCode(
        "schema",
        schemaHash,
        minifiedSchema,
        [fileName],
        0
      );
    },
  },
};

export function reconstructMatchDataFromArray(
  schema: Schema,
  values: FieldValue[]
): Record<string, any> {
  const reconstructed: Record<string, any> = {};

  const allFields = schema.sections.flatMap((section) => section.fields);

  allFields.forEach((field, index) => {
    const rawValue = values[index] !== "" ? values[index] : "*";
    reconstructed[field.id] = rawValue === "*" ? "" : rawValue;
  });

  return reconstructed;
}

/**
 * Builds a string that can then be encoded into qr
 * @param type the type of data encoded in the qr
 * @param schemaHash an 8 character has representing the current schema
 * @param payload the compressed, base64-encoded payload (already processed by compressData)
 * @returns An encoded string
 */
function buildQrString(
  type: QrType,
  schemaHash: string,
  deviceId: number,
  compressedPayload: string
): EncodedQr {
  const typeCode = type.charAt(0); // m=match, s=schema, t=theme, e=settings
  return `${APP_PREFIX}:${typeCode}:${schemaHash}:${deviceId}:${compressedPayload}`;
}

/**
 * Decodes and validates a qr string
 * @param qrString the qr string to decode
 * @param currentSchemaHash an 8 character representation of the users current schema
 * @returns an object containing the type, schemaHash, and data encoded into the code
 */
export async function decodeQR(qrString: string): Promise<DecodedQr> {
  const [prefix, typeCode, schemaHash, deviceId, compressed] =
    qrString.split(":");

  if (prefix !== APP_PREFIX) throw new Error("Invalid QR prefix");
  if (!typeCode) throw new Error("QR type missing");
  if (!compressed) throw new Error("QR payload missing");

  // Map single letter codes back to full type names
  const typeMap: Record<string, QrType> = {
    m: "match",
    s: "schema",
    t: "theme",
    e: "settings",
  };

  const type = typeMap[typeCode];
  if (!type) throw new Error("Unknown QR type");

  const data = await decompressData(compressed);

  return {
    deviceId: parseInt(deviceId),
    type,
    schemaHash,
    data,
  };
}

/**
 * Generates the name for a qr file
 * @param qrNameInfo an array of strings to include in the filename
 * @returns a string with the file name
 */
function generateQrFileName(qrNameInfo: string[]): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const infoString = qrNameInfo.join("-");
  return `${infoString}-${timestamp}.svg`;
}

/**
 * Writes data
 * @param type the type of data encoded in the qr code
 * @param schemaHash an 8 character representation of the users current schema
 * @param payload the data to be encoded
 * @param identifier a unique key for this code
 * @returns an object containing filename, encoded data, and an svg string.
 */
async function writeDataToQrCode(
  type: QrType,
  schemaHash: string,
  payload: any,
  qrNameInfo: string[],
  deviceId: number
): Promise<QrCode> {
  const compressed = await compressData(payload);
  const qrString = buildQrString(type, schemaHash, deviceId, compressed);
  const qrSvg = await invoke<string>("generate_qr_code", { data: qrString });
  const fileName = generateQrFileName(qrNameInfo);

  return { name: fileName, data: qrString, image: qrSvg };
}

export async function archiveQrCode(qrCode: QrCode): Promise<void> {
  await StoreManager.archiveQrCode(qrCode.name);
}

export async function unarchiveQrCode(qrCode: QrCode): Promise<void> {
  await StoreManager.unarchiveQrCode(qrCode.name);
}

export async function isQrCodeArchived(qrCode: QrCode): Promise<boolean> {
  return await StoreManager.isQrCodeArchived(qrCode.name);
}

export async function markQrCodeAsScanned(qrCode: QrCode): Promise<void> {
  await StoreManager.markQrCodeAsScanned(qrCode.name);
}

export async function markQrCodeAsUnscanned(qrCode: QrCode): Promise<void> {
  await StoreManager.markQrCodeAsUnscanned(qrCode.name);
}

export async function isQrCodeScanned(qrCode: QrCode): Promise<boolean> {
  return await StoreManager.isQrCodeScanned(qrCode.name);
}

export function validateQR(qrString: string): boolean {
  const parts = qrString.split(":");
  if (parts.length !== 5) return false;

  const [prefix, typeCode, schemaHash, _, compressed] = parts;
  if (!prefix || !typeCode || !schemaHash || !compressed) {
    return false;
  }
  if (prefix === APP_PREFIX && ["m", "s", "t", "e"].includes(typeCode)) {
    return true;
  }
  return false;
}

export function getDataFromQrName(name: string) {
  const [teamNumber, matchNumber, timestamp] = name
    .replace(".svg", "")
    .split("-");

  return {
    TeamNumber: teamNumber,
    MatchNumber: matchNumber,
    Timestamp: timestamp,
  };
}

export async function saveQrCode(code: QrCode) {
  await mkdir("saved-matches", {
    baseDir: BaseDirectory.AppLocalData,
    recursive: true,
  });

  const filePath = await resolve(
    await appLocalDataDir(),
    "saved-matches",
    code.name
  );

  const svgToSave = EmbedDataInSvg(code);

  await invoke("save_qr_svg", {
    svg: svgToSave,
    filePath,
  });
}

export async function deleteQrCode(code: QrCode) {
  const filePath = await resolve(
    await appLocalDataDir(),
    "saved-matches",
    code.name
  );

  await invoke("delete_qr_code", {
    path: filePath,
  });
}

export async function createQrCodeFromImportedData(
  data: string,
  schema: Schema
) {
  const [_prefix, type, schemaHash, deviceId, compressed] = data.split(":");

  const qrString = buildQrString(
    type as QrType,
    schemaHash,
    parseInt(deviceId),
    compressed
  );
  const qrSvg = await invoke<string>("generate_qr_code", { data: qrString });
  const decoded = await decodeQR(data);
  console.log(decoded);
  const matchDataJSON = reconstructMatchDataFromArray(schema, decoded.data);
  const matchData = matchDataJsonToMap(matchDataJSON);
  const teamNumber = getFieldValueByName("Team Number", schema, matchData);
  const matchNumber = getFieldValueByName("Match Number", schema, matchData);
  const fileName = generateQrFileName([teamNumber!, matchNumber!]);
  return { name: fileName, data: qrString, image: qrSvg };
}

export async function fetchQrCodes(): Promise<QrCode[] | undefined> {
  const folderExists = await exists("saved-matches", {
    baseDir: BaseDirectory.AppLocalData,
  });
  if (!folderExists) return;

  const files = await readDir("saved-matches", {
    baseDir: BaseDirectory.AppLocalData,
  });
  const svgs = files.filter((f) => f.name.endsWith(".svg"));

  const results = await Promise.all(
    svgs.map(async (file) => {
      const contents = await readTextFile(`saved-matches/${file.name}`, {
        baseDir: BaseDirectory.AppLocalData,
      });

      const archived = await StoreManager.isQrCodeArchived(file.name);
      const scanned = await StoreManager.isQrCodeScanned(file.name);
      return {
        name: file.name,
        data: GetDescFromSvg(contents),
        image: contents,
        archived,
        scanned,
      } as QrCode;
    })
  );

  return results;
}

export function validateQrType(type: QrType, qrData: string): boolean {
  if (!validateQR(qrData)) return false;
  const parts = qrData.split(":");
  return parts[0] === "frmhnd" && parts[1] === type.charAt(0);
}

export function getQRType(qrData: string): "MATCH" | "SCHEMA" | "UNKNOWN" {
  if (!validateQR(qrData)) return "UNKNOWN";
  if (validateQrType("match", qrData)) return "MATCH";
  if (validateQrType("schema", qrData)) return "SCHEMA";
  return "UNKNOWN";
}

export async function decodeSchemaQR(qrData: string): Promise<Schema | null> {
  if (!validateQrType("schema", qrData)) return null;
  try {
    const decoded = await decodeQR(qrData);
    if (decoded.type !== "schema") {
      throw new Error("QR is not a schema type");
    }
    const deminified = deminifySchema(decoded.data);
    return deminified as Schema;
  } catch (error) {
    console.error("Error decoding schema QR:", error);
    return null;
  }
}
