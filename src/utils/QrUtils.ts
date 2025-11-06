import { invoke } from "@tauri-apps/api/core";
import { decodeData, encodeData } from "./GeneralUtils";

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
  version: string;
  schemaHash: string;
  data: any;
}

const APP_PREFIX = "frmhnd";
const QR_VERSION = "v1";

/**
 * Builds a string that can then be encoded into qr
 * @param type the type of data encoded in the qr
 * @param schemaHash an 8 character has representing the current schema
 * @param payload the data to actually encode
 * @returns An encoded string
 */
export function buildQrString(
  type: QrType,
  schemaHash: string,
  payload: any
): EncodedQr {
  const encoded = encodeData(payload);
  return `${APP_PREFIX}:${type}:${QR_VERSION}:${schemaHash}:${encoded}`;
}

/**
 * Decodes and validates a qr string
 * @param qrString the qr string to decode
 * @param currentSchemaHash an 8 character representation of the users current schema
 * @returns an object containing the type, version, schemaHash, and data encoded into the code
 */
export function decodeQR(
  qrString: string,
  currentSchemaHash?: string
): DecodedQr {
  const [prefix, type, version, schemaHash, encoded] = qrString.split(":");
  if (prefix !== APP_PREFIX) throw new Error("Invalid QR prefix");
  if (!type) throw new Error("QR type missing");
  if (!encoded) throw new Error("QR payload missing");

  // If it's match data and we have a schema hash to compare
  if (
    currentSchemaHash &&
    schemaHash !== currentSchemaHash &&
    type === "match"
  ) {
    throw new Error("Schema mismatch");
  }

  const data = decodeData(encoded);
  return { type: type as QrType, version, schemaHash, data };
}

/**
 * Generates a consistent file name for the qr
 * @param type The type of data encoded into the qr
 * @param schemaHash an 8 character representation of the users current schema
 * @param identifier a unique string for this code
 * @returns
 */
export function generateQrFileName(
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
export async function writeDataToQrCode(
  type: QrType,
  schemaHash: string,
  payload: any,
  identifier?: string
): Promise<QrCode> {
  const qrString = buildQrString(type, schemaHash, payload);
  console.log("Qr String:", qrString)
  const qrSvg = await invoke<string>("generate_qr_code", { data: qrString });
  const fileName = generateQrFileName(type, schemaHash, identifier);

  return { name: fileName, data: qrString, image: qrSvg };
}

export const QrCodeBuilder = {
  Headers: {
    TITLE: APP_PREFIX,
  },
  Build: {
    MATCH: (schemaHash: string, payload: any) =>
      buildQrString("match", schemaHash, payload),
  },
};
