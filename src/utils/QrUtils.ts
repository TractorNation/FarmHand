import { invoke } from "@tauri-apps/api/core";
import { compressData, createSchemaHash, decompressData, deminifySchema, minifySchema } from "./SchemaWire";
import { getFieldValueByName, matchDataJsonToMap, orderedFields } from "./schemaFields";
import { EmbedDataInSvg, GetDescFromSvg } from "./svgPayload";
import { appLocalDataDir, resolve } from "@tauri-apps/api/path";
import {
  BaseDirectory,
  exists,
  mkdir,
  readDir,
  readTextFile,
} from "@tauri-apps/plugin-fs";
import StoreManager, { StoreKeys } from "./StoreManager";
import { removeQrFromAllFolders } from "./FolderUtils";
import { decodeBase45, encodeBase45 } from "./Base45";
import { decodeMatchBody, encodeMatchBody } from "./MatchCodec";
import { getSchemaFromHash } from "./SchemaUtils";
import { decodeBatchBody } from "./BatchCodec";

export type QrType = "match" | "schema" | "theme" | "settings" | "batch";
export type EncodedQr = string;

export interface DecodedQr {
  deviceId: number;
  type: QrType;
  schemaHash: string;
  /**
   * For match codes: field values positionally, in orderedFields(schema) order.
   *
   * The whole analysis pipeline indexes this array by field index, so bit packing
   * stays a transport concern and never reaches the charting layer.
   */
  data: any;
  /** Whether the payload's CRC-8 verified. */
  checksumOk: boolean;
}

type FieldValue = string | number | boolean | null;

/**
 * Uppercase so the entire string sits inside the QR alphanumeric charset.
 *
 * Case-sensitive on the way in, which is also what rejects the retired v1 format:
 * v1 codes are lowercase `frmhnd:…` and fail the prefix comparison outright.
 */
const APP_PREFIX = "FRMHND";

/** Raised when a match code cannot be decoded because its schema is unavailable. */
export class SchemaRequiredError extends Error {
  constructor(public readonly schemaHash: string) {
    super(
      `This QR code was recorded with schema ${schemaHash}, which is not on this device.`
    );
    this.name = "SchemaRequiredError";
  }
}

/**
 * Builder tool for qr codes, will eventually include all types and other helpful build functions
 */
export const QrCodeBuilder = {
  buildFileName: (qrNameInfo: string[]) => generateQrFileName(qrNameInfo),
  build: {
    /**
     * Encodes a scouted match as a bit-packed code.
     *
     * Takes the schema because every bit width is derived from it; the reader
     * recovers the same widths via the schema hash.
     */
    MATCH: async (
      schema: Schema,
      schemaHash: string,
      values: Map<number, any>,
      qrNameInfo: string[],
      deviceId: number
    ) => {
      const payload = encodeBase45(encodeMatchBody(schema, values));
      const qrString = buildQrString("match", schemaHash, deviceId, payload);
      return await renderQrCode(qrString, generateQrFileName(qrNameInfo));
    },
    /**
     * Encodes a whole schema for transfer to another device.
     *
     * Keeps a zlib/base64 payload rather than the bit packing match codes use: a
     * schema is repetitive JSON of unbounded shape, so general-purpose compression
     * beats anything schema-driven here, and an uncompressed schema would produce a
     * noticeably denser code to scan.
     */
    SCHEMA: async (schema: Schema) => {
      const schemaHash = await createSchemaHash(schema);
      const fileName = `Schema_${schema.name.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
      const minifiedSchema = minifySchema(schema);
      const compressed = await compressData(minifiedSchema);
      const qrString = buildQrString("schema", schemaHash, 0, compressed);
      return await renderQrCode(qrString, generateQrFileName([fileName]));
    },
  },
};

interface QrHeader {
  type: QrType;
  /** Normalized to lowercase hex so it compares against createSchemaHash output. */
  schemaHash: string;
  deviceId: number;
  payload: string;
}

const TYPE_BY_CODE: Record<string, QrType> = {
  M: "match",
  S: "schema",
  T: "theme",
  E: "settings",
  B: "batch",
};

const CODE_BY_TYPE: Record<QrType, string> = {
  match: "M",
  schema: "S",
  theme: "T",
  settings: "E",
  batch: "B",
};

/**
 * Splits a QR string on its first four colons and treats the rest as payload.
 *
 * A plain split(":") would corrupt these codes: the Base45 alphabet contains both ':'
 * and ' ', and every punctuation character in the QR alphanumeric set is also a
 * Base45 character, so no delimiter can avoid this. Parse by offset instead.
 *
 * The type token is exactly one character. There is a single wire format, so a
 * version number would be a constant on every code and is not transmitted; a token
 * carrying anything more than the type is not one of ours and is rejected here rather
 * than half-decoding into values attributed to the wrong fields. The retired v1
 * format is excluded by the case-sensitive prefix check above it.
 */
export function parseQrHeader(qrString: string): QrHeader | null {
  let start = 0;
  const parts: string[] = [];
  for (let i = 0; i < 4; i++) {
    const idx = qrString.indexOf(":", start);
    if (idx === -1) return null;
    parts.push(qrString.slice(start, idx));
    start = idx + 1;
  }

  const [prefix, typeToken, schemaHash, deviceId] = parts;
  const payload = qrString.slice(start);

  if (prefix !== APP_PREFIX) return null;
  if (typeToken.length !== 1 || !schemaHash || !payload) return null;

  const type = TYPE_BY_CODE[typeToken];
  if (!type) return null;

  return {
    type,
    schemaHash: schemaHash.toLowerCase(),
    deviceId: Number.parseInt(deviceId, 10) || 0,
    payload,
  };
}

/** Extracts just the schema hash, normalized, or null if the string is not ours. */
export function getSchemaHashFromQrString(qrString: string): string | null {
  return parseQrHeader(qrString)?.schemaHash ?? null;
}

/**
 * Keys a decoded positional value array by field id.
 *
 * Unset values are preserved as `null` rather than replaced with a per-type default.
 * Substituting here made a field the scout never touched indistinguishable from a
 * real entry — an untouched number exported as `0`, and blank text as the literal
 * "No text provided" — which is exactly the distinction autopath goes to trouble to
 * keep (`NOT_RECORDED` vs a genuine empty path). It also disagreed with the charting
 * layer, which reads `decoded.data` positionally and has always seen raw nulls.
 *
 * Presentation of "not recorded" belongs to each consumer: `formatValue` renders it
 * for display, exports emit null / an empty cell.
 */
export function reconstructMatchDataFromArray(
  schema: Schema,
  values: FieldValue[]
): Record<string, any> {
  const reconstructed: Record<string, any> = {};
  const allFields = orderedFields(schema);

  allFields.forEach((field, index) => {
    const raw = values[index];
    reconstructed[field.id] = raw === "" || raw === undefined ? null : raw;
  });

  return reconstructed;
}

/** Assembles a QR string. Uppercase throughout so it stays QR-alphanumeric. */
function buildQrString(
  type: QrType,
  schemaHash: string,
  deviceId: number,
  payload: string
): EncodedQr {
  return `${APP_PREFIX}:${CODE_BY_TYPE[type]}:${schemaHash.toUpperCase()}:${deviceId}:${payload}`;
}

/**
 * Decodes and validates a qr string.
 *
 * Branches on the code's *type*, since match and schema codes carry different
 * payloads: matches are schema-driven bit packing, schemas are compressed JSON.
 *
 * @param schema required for match codes, whose bit widths come from the schema.
 *   Resolve it from the code's hash first, or use {@link decodeQrWithSchemas}.
 */
export async function decodeQR(
  qrString: string,
  schema?: Schema | null
): Promise<DecodedQr> {
  const header = parseQrHeader(qrString);
  if (!header) throw new Error("Invalid or unrecognized QR code");

  const { type, schemaHash, deviceId, payload } = header;

  if (type === "schema") {
    return {
      deviceId,
      type,
      schemaHash,
      /*
        `true` here means "there is no checksum to fail", not "the checksum passed".
        Match codes carry a CRC-8; schema codes carry nothing.

        Integrity comes one layer up instead: `decompressData` runs `JSON.parse` on
        the inflated text, and a truncated payload produces unbalanced JSON and
        throws. Do not credit that to the inflate itself — `util::inflate_data`
        returns whatever it managed to decode when a zlib stream ends early, which
        the Rust tests demonstrate. Structural JSON validity is what stands behind a
        schema code, and it is reliable for a truncated object.
      */
      checksumOk: true,
      data: await decompressData(payload),
    };
  }

  if (type !== "match") {
    throw new Error(`decodeQR does not handle "${type}" codes`);
  }

  if (!schema) throw new SchemaRequiredError(schemaHash);

  const { values, checksumOk } = decodeMatchBody(schema, decodeBase45(payload));

  // Flatten back to the positional array every consumer expects. Fillers occupy a
  // slot so field indices line up with orderedFields.
  const data = orderedFields(schema).map((field) => values.get(field.id) ?? null);

  return { deviceId, type, schemaHash, checksumOk, data };
}

/**
 * Decodes a code after resolving its schema by hash — the convenient entry point
 * for callers that hold `availableSchemas` rather than one specific schema.
 */
export async function decodeQrWithSchemas(
  qrString: string,
  availableSchemas: SchemaMetaData[]
): Promise<DecodedQr> {
  const header = parseQrHeader(qrString);
  if (!header) throw new Error("Invalid or unrecognized QR code");

  // Schema codes carry their own payload and need no lookup.
  if (header.type === "schema") return decodeQR(qrString);

  const schema = await getSchemaFromHash(header.schemaHash, availableSchemas);
  if (!schema) throw new SchemaRequiredError(header.schemaHash);
  return decodeQR(qrString, schema);
}

/**
 * Generates the name for a qr file
 * @param qrNameInfo an array of strings to include in the filename
 * @returns a string with the file name
 */
function generateQrFileName(qrNameInfo: string[]): string {
  // Milliseconds, not seconds: the filename is the identity of the saved file, and at
  // one-second resolution re-scouting a team or importing a batch could produce two
  // codes in the same tick, silently overwriting the first. getDataFromQrName splits
  // on the first and last dash, so the longer segment still parses and existing
  // second-resolution filenames keep working.
  const timestamp = Date.now();
  const infoString = qrNameInfo.join("-");
  return `${infoString}-${timestamp}.svg`;
}

/** Renders a QR string to an SVG. */
export async function renderQrString(qrString: EncodedQr): Promise<string> {
  return await invoke<string>("generate_qr_code", { data: qrString });
}

/** Renders a finished QR string to SVG and pairs it with a filename. */
async function renderQrCode(
  qrString: EncodedQr,
  fileName: string
): Promise<QrCode> {
  return {
    name: fileName,
    data: qrString,
    image: await renderQrString(qrString),
  };
}

/**
 * Extracts a saved match code's already-encoded body, ready to drop into a batch.
 *
 * The exact inverse of {@link expandBatchQr}. The bytes are reused verbatim rather
 * than decoded and re-encoded: a round trip through `reconstructMatchDataFromArray`
 * bakes its invented defaults into the batch — an unset number becomes `0`, an empty
 * comment becomes the literal string "No text provided" — corrupting the data and
 * inflating the payload against the capacity budget.
 *
 * Returns null for anything that is not a match code.
 */
export function rawMatchPayload(
  qrString: string
): { deviceId: number; payload: Uint8Array } | null {
  const header = parseQrHeader(qrString);
  if (!header || header.type !== "match") return null;

  return {
    deviceId: header.deviceId,
    payload: decodeBase45(header.payload),
  };
}

/**
 * Assembles a batch QR string. Device id is 0 because a batch carries a per-record
 * device id instead — see BatchCodec.
 */
export function buildBatchQrString(
  schemaHash: string,
  base45Payload: string
): EncodedQr {
  return buildQrString("batch", schemaHash, 0, base45Payload);
}

/**
 * Decodes a batch code into the individual match strings it carries.
 *
 * Each entry is re-emitted as a standalone match QR string so the import path can
 * reuse createQrCodeFromImportedData and every batched match lands on disk as an
 * ordinary saved match.
 */
export function expandBatchQr(qrString: string): {
  schemaHash: string;
  matchStrings: string[];
  checksumOk: boolean;
} {
  const header = parseQrHeader(qrString);
  if (!header || header.type !== "batch") {
    throw new Error("Not a FarmHand batch QR code");
  }

  const { entries, checksumOk } = decodeBatchBody(decodeBase45(header.payload));

  const matchStrings = entries.map((entry) =>
    buildQrString(
      "match",
      header.schemaHash,
      entry.deviceId,
      encodeBase45(entry.payload)
    )
  );

  return { schemaHash: header.schemaHash, matchStrings, checksumOk };
}

// These take the code's name rather than the whole QrCode: the name is all they use,
// and folder membership is stored as names, so callers often hold nothing else.

export async function archiveQrCode(qrName: string): Promise<void> {
  await StoreManager.archiveQrCode(qrName);
}

export async function unarchiveQrCode(qrName: string): Promise<void> {
  await StoreManager.unarchiveQrCode(qrName);
}

export async function markQrCodeAsScanned(qrName: string): Promise<void> {
  await StoreManager.markQrCodeAsScanned(qrName);
}

export async function markQrCodeAsUnscanned(qrName: string): Promise<void> {
  await StoreManager.markQrCodeAsUnscanned(qrName);
}

export function validateQR(qrString: string): boolean {
  return parseQrHeader(qrString) !== null;
}

export function getDataFromQrName(name: string) {
  const stripped = name.replace(".svg", "");
  const firstDash = stripped.indexOf("-");
  const lastDash = stripped.lastIndexOf("-");

  if (firstDash === -1 || firstDash === lastDash) {
    return { TeamNumber: stripped, MatchNumber: "", Timestamp: "" };
  }

  return {
    TeamNumber: stripped.substring(0, firstDash),
    MatchNumber: stripped.substring(firstDash + 1, lastDash),
    Timestamp: stripped.substring(lastDash + 1),
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


/**
 * Deletes a saved code and everything that refers to it.
 *
 * The store writes must be awaited: fired-and-forgotten they lose races and leave
 * `archived`/`scanned` flags behind for a code that no longer exists. Folder
 * membership lives in `folder.qrCodes`, so it has to be cleaned separately — a
 * lingering name inflates the folder's count and makes "delete folder and its codes"
 * attempt to remove a missing file.
 */
export async function deleteQrCode(qrName: string) {
  await Promise.all([
    StoreManager.remove(StoreKeys.code.archived(qrName)),
    StoreManager.remove(StoreKeys.code.scanned(qrName)),
    removeQrFromAllFolders(qrName),
  ]);

  const filePath = await resolve(
    await appLocalDataDir(),
    "saved-matches",
    qrName
  );

  await invoke("delete_qr_code", {
    path: filePath,
  });
}

/**
 * Deletes every saved code — active and archived alike — along with the folders that
 * organized them.
 *
 * Deliberately not a loop over {@link deleteQrCode}: that reloads and rewrites every
 * folder once per code, which is quadratic over a full event's worth of matches, and
 * here the folders are being removed anyway. Folder keys are dropped directly rather
 * than through `StoreManager.deleteFolder`, whose read-modify-write of the id list
 * would lose entries when run concurrently.
 *
 * @returns the number of code files deleted.
 */
export async function clearAllQrCodes(): Promise<number> {
  const folderExists = await exists("saved-matches", {
    baseDir: BaseDirectory.AppLocalData,
  });

  const names = folderExists
    ? (
        await readDir("saved-matches", {
          baseDir: BaseDirectory.AppLocalData,
        })
      )
        .filter((f) => f.name.endsWith(".svg"))
        .map((f) => f.name)
    : [];

  const dataDir = await appLocalDataDir();

  await Promise.all(
    names.map(async (name) => {
      await invoke("delete_qr_code", {
        path: await resolve(dataDir, "saved-matches", name),
      });
      await Promise.all([
        StoreManager.remove(StoreKeys.code.archived(name)),
        StoreManager.remove(StoreKeys.code.scanned(name)),
      ]);
    })
  );

  const folders = await StoreManager.getFolders();
  await Promise.all(
    folders.map((folder) =>
      StoreManager.remove(StoreKeys.folders.byId(folder.id))
    )
  );
  await StoreManager.set(StoreKeys.folders.list, JSON.stringify([]));

  return names.length;
}

/**
 * Turns a scanned QR string into a saveable QrCode.
 *
 * The scanned string is re-rendered verbatim rather than re-encoded, so an imported
 * code keeps whatever payload version it arrived with and stays byte-identical to
 * the code on the originating device.
 */
export async function createQrCodeFromImportedData(
  data: string,
  schema: Schema
) {
  const decoded = await decodeQR(data, schema);
  const matchDataJSON = reconstructMatchDataFromArray(schema, decoded.data);
  const matchData = matchDataJsonToMap(matchDataJSON);
  const teamNumber = getFieldValueByName("Team Number", schema, matchData);
  const matchNumber = getFieldValueByName("Match Number", schema, matchData);
  return await renderQrCode(data, generateQrFileName([teamNumber!, matchNumber!]));
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
  return parseQrHeader(qrData)?.type === type;
}

export function getQRType(
  qrData: string
): "MATCH" | "SCHEMA" | "BATCH" | "UNKNOWN" {
  const type = parseQrHeader(qrData)?.type;
  if (type === "match") return "MATCH";
  if (type === "schema") return "SCHEMA";
  if (type === "batch") return "BATCH";
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
