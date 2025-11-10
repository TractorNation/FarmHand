import { invoke } from "@tauri-apps/api/core";
import {
  compressData,
  decompressData,
  EmbedDataInSvg,
  getFieldValueByName,
  matchDataJsonToMap,
} from "./GeneralUtils";
import { appLocalDataDir, resolve } from "@tauri-apps/api/path";
import { BaseDirectory, mkdir } from "@tauri-apps/plugin-fs";

export type QrType = "match" | "schema" | "theme" | "settings";
export type EncodedQr = string;

export interface QrCode {
  name: string;
  data: string;
  image: string;
}

export interface DecodedQr {
  type: QrType;
  schemaHash: string;
  data: any;
}

type FieldValue = string | number | boolean | null;

const APP_PREFIX = "frmhnd";

export function reconstructMatchDataFromArray(
  schema: Schema,
  values: FieldValue[]
): Record<string, any> {
  const reconstructed: Record<string, any> = {};
  schema.sections.forEach((section) => {
    section.fields.forEach((field, index) => {
      const rawValue = values[index] !== "" ? values[index] : "*";
      reconstructed[field.id] = rawValue === "*" ? "" : rawValue;
    });
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
  compressedPayload: string
): EncodedQr {
  return `${APP_PREFIX}:${type.charAt(0)}:${schemaHash}:${compressedPayload}`;
}

/**
 * Decodes and validates a qr string
 * @param qrString the qr string to decode
 * @param currentSchemaHash an 8 character representation of the users current schema
 * @returns an object containing the type, schemaHash, and data encoded into the code
 */
export async function decodeQR(
  qrString: string,
  currentSchemaHash?: string
): Promise<DecodedQr> {
  const [prefix, type, schemaHash, compressed] = qrString.split(":");
  console.log(qrString.split(":"));
  if (prefix !== APP_PREFIX) throw new Error("Invalid QR prefix");
  if (!type) throw new Error("QR type missing");
  if (!compressed) throw new Error("QR payload missing");
  const data = await decompressData(compressed);

  // If it's match data and we have a schema hash to compare
  if (
    currentSchemaHash &&
    schemaHash !== currentSchemaHash &&
    type === "match"
  ) {
    throw new Error("Schema mismatch");
  }

  return { type: type as QrType, schemaHash, data };
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
  qrNameInfo: string[]
): Promise<QrCode> {
  const compressed = await compressData(payload);
  const qrString = buildQrString(type, schemaHash, compressed);
  const qrSvg = await invoke<string>("generate_qr_code", { data: qrString });
  const fileName = generateQrFileName(qrNameInfo);

  return { name: fileName, data: qrString, image: qrSvg };
}

/**
 * Builder tool for qr codes, will eventually include all types and other helpful build functions
 */
export const QrCodeBuilder = {
  buildFileName: (qrNameInfo: string[]) => generateQrFileName(qrNameInfo),
  build: {
    MATCH: async (schemaHash: string, payload: any, qrNameInfo: string[]) =>
      await writeDataToQrCode("match", schemaHash, payload, qrNameInfo),
  },
};

export function validateQR(qrString: string) {
  const [prefix, type, schemaHash, compressed] = qrString.split(":");
  if (!prefix || !type || !schemaHash || !compressed) {
    return false;
  }
  if (prefix === APP_PREFIX) return true;
  return false;
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
  const [_prefix, type, schemaHash, compressed] = data.split(":");

  const qrString = buildQrString(type as QrType, schemaHash, compressed);
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
