import { invoke } from "@tauri-apps/api/core";
import { compressData, decompressData } from "./GeneralUtils";

export type QrType = "match" | "schema" | "theme" | "settings";
export type EncodedQr = string;

export interface Schema {
  name: string;
  sections: any[];
}

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

const APP_PREFIX = "frmhnd";

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
 * Generates a consistent file name for the qr
 * @param type The type of data encoded into the qr
 * @param schemaHash an 8 character representation of the users current schema
 * @param identifier a unique string for this code
 * @returns
 */
function generateQrFileName(
  type: QrType,
  schemaHash: string,
  identifier?: string
) {
  const timestamp = Date.now();
  const safeId = identifier ? `-${identifier}` : "";
  return `${type}-${schemaHash}${safeId}-${timestamp}.svg`;
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
  identifier?: string
): Promise<QrCode> {
  const compressed = await compressData(payload);
  const qrString = buildQrString(type, schemaHash, compressed);
  const qrSvg = await invoke<string>("generate_qr_code", { data: qrString });
  const fileName = generateQrFileName(type, schemaHash, identifier);

  return { name: fileName, data: qrString, image: qrSvg };
}

/**
 * Builder tool for qr codes, will eventually include all types and other helpful build functions
 */
export const QrCodeBuilder = {
  buildFileName: (type: QrType, schemaHash: string, identifier?: string) =>
    generateQrFileName(type, schemaHash, identifier),
  build: {
    MATCH: async (schemaHash: string, payload: any, id?: string) =>
      await writeDataToQrCode("match", schemaHash, payload, id),
  },
};
