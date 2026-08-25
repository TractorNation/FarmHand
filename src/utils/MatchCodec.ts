import { BitReader, BitWriter, bitsForCount } from "./BitStream";
import { crc8 } from "./Base45";
import {
  AutoPathValue,
  asAutoPathValue,
  decodePath,
  encodePath,
  pathVocabulary,
} from "./PathCodec";
import { UNSET_OPTION } from "./fieldValidation";
import { formatTime, parseTime } from "./valueFormat";
import { orderedFields } from "./schemaFields";

/**
 * Schema-driven bit packing for a match's field values (QR type token "M").
 *
 * Both sides derive every bit width from the schema, which the QR's schema hash
 * pins, so the payload carries values only — no names, no types, no lengths beyond
 * what is genuinely variable. See docs/WIRE_FORMAT.md for the authoritative spec.
 */

/** Flag bits in the leading header byte. */
const FLAG_NONE = 0;

/** Widest text field supported, in UTF-8 bytes (length is an 8-bit field). */
export const MAX_TEXT_BYTES = 255;

/** Values wider than this many steps fall back to a varint. */
const MAX_BOUNDED_RANGE = 65536;

/**
 * Re-exported so the wire order and the schema's flat field order can never be two
 * different things — `schemaFields.orderedFields` is the single definition.
 */
export { orderedFields };

/** Fields that actually occupy bits. Fillers are layout spacers with no value. */
export function encodableFields(schema: Schema): Component[] {
  return orderedFields(schema).filter((f) => f.type !== "filler");
}

// ---------------------------------------------------------------------------
// Scalar helpers
// ---------------------------------------------------------------------------

/** Maps a signed integer onto the non-negative range a varint can carry. */
function zigzagEncode(n: number): number {
  return n >= 0 ? n * 2 : -n * 2 - 1;
}

function zigzagDecode(n: number): number {
  return n % 2 === 0 ? n / 2 : -(n + 1) / 2;
}

function boundedWidth(min?: number, max?: number): number | null {
  if (min == null || max == null) return null;
  const span = Math.floor(max) - Math.floor(min);
  if (span < 0 || span + 1 > MAX_BOUNDED_RANGE) return null;
  return bitsForCount(span + 1);
}

/**
 * Numbers are written as a presence bit plus either a bounded fixed-width value
 * (when the schema declares min and max) or a zigzag varint.
 */
function writeNumber(
  w: BitWriter,
  value: any,
  min?: number,
  max?: number
): void {
  const num = typeof value === "number" ? value : Number(value);
  if (value === null || value === undefined || value === "" || !Number.isFinite(num)) {
    w.writeBit(0);
    return;
  }
  w.writeBit(1);

  const width = boundedWidth(min, max);
  if (width !== null) {
    const lo = Math.floor(min!);
    const hi = Math.floor(max!);
    const clamped = Math.max(lo, Math.min(hi, Math.round(num)));
    w.writeBits(clamped - lo, width);
  } else {
    w.writeVarint(zigzagEncode(Math.round(num)));
  }
}

function readNumber(r: BitReader, min?: number, max?: number): number | null {
  if (!r.readBit()) return null;
  const width = boundedWidth(min, max);
  if (width !== null) return r.readBits(width) + Math.floor(min!);
  return zigzagDecode(r.readVarint());
}

function gridDimensions(component: Component): { rows: number; cols: number } {
  return {
    rows: Math.max(1, component.props?.rows ?? 3),
    cols: Math.max(1, component.props?.cols ?? 3),
  };
}

/** Parses the active-cell indices out of either "3x3:[1,2]" or "3x3[1,2]". */
function parseGridIndices(value: any): number[] {
  if (typeof value !== "string") return [];
  const match = value.match(/\[(.*)\]/);
  if (!match || match[1].trim() === "") return [];
  return match[1]
    .split(",")
    .map((n) => parseInt(n.trim(), 10))
    .filter((n) => Number.isFinite(n));
}

// ---------------------------------------------------------------------------
// Per-field encode / decode
// ---------------------------------------------------------------------------

function encodeField(w: BitWriter, component: Component, value: any): void {
  const props = component.props;

  switch (component.type) {
    case "checkbox":
      w.writeBit(value === true ? 1 : 0);
      break;

    case "dropdown":
    case "multiplechoice": {
      const options = props?.options ?? [];
      // Index 0 is the unset sentinel; real options are 1-based on the wire.
      const found = options.indexOf(String(value));
      const code = value === UNSET_OPTION || found === -1 ? 0 : found + 1;
      w.writeBits(code, bitsForCount(options.length + 1));
      break;
    }

    case "counter":
    case "number":
      writeNumber(w, value, props?.min, props?.max);
      break;

    case "slider": {
      const min = props?.min ?? 0;
      const max = props?.max ?? 25;
      if (props?.selectsRange) {
        const pair = Array.isArray(value) ? value : [min, max];
        writeNumber(w, pair[0], min, max);
        writeNumber(w, pair[1], min, max);
      } else {
        writeNumber(w, value, min, max);
      }
      break;
    }

    case "timer": {
      // parseTime yields deciseconds, which is the timer's real resolution.
      const tenths = parseTime(typeof value === "string" ? value : undefined);
      if (value === null || value === undefined || value === "") {
        w.writeBit(0);
      } else {
        w.writeBit(1);
        w.writeVarint(Math.max(0, tenths));
      }
      break;
    }

    case "grid": {
      const { rows, cols } = gridDimensions(component);
      const active = new Set(parseGridIndices(value));
      for (let i = 0; i < rows * cols; i++) {
        w.writeBit(active.has(i) ? 1 : 0);
      }
      break;
    }

    case "text": {
      const text = value == null ? "" : String(value);
      if (text === "") {
        w.writeBit(0);
        break;
      }
      w.writeBit(1);
      const encoder = new TextEncoder();
      let bytes = encoder.encode(text);
      if (bytes.length > MAX_TEXT_BYTES) {
        // Truncate by code point, not by UTF-16 code unit. Slicing a unit off an
        // emoji leaves a lone surrogate, which encodes as U+FFFD and both corrupts
        // the text and grows it.
        const chars = Array.from(text);
        let total = 0;
        let cut = 0;
        for (; cut < chars.length; cut++) {
          const size = encoder.encode(chars[cut]).length;
          if (total + size > MAX_TEXT_BYTES) break;
          total += size;
        }
        bytes = encoder.encode(chars.slice(0, cut).join(""));
      }
      w.writeBits(bytes.length, 8);
      w.writeBytes(bytes);
      break;
    }

    case "autopath":
      encodePath(w, asAutoPathValue(value), pathVocabulary(props));
      break;

    default:
      // Unknown types are stored as text so a forward-declared field still
      // round-trips instead of desynchronising the whole stream.
      encodeField(w, { ...component, type: "text" }, value);
      break;
  }
}

function decodeField(r: BitReader, component: Component): any {
  const props = component.props;

  switch (component.type) {
    case "checkbox":
      return r.readBit() === 1;

    case "dropdown":
    case "multiplechoice": {
      const options = props?.options ?? [];
      const code = r.readBits(bitsForCount(options.length + 1));
      return code === 0 ? UNSET_OPTION : (options[code - 1] ?? UNSET_OPTION);
    }

    case "counter":
    case "number":
      return readNumber(r, props?.min, props?.max);

    case "slider": {
      const min = props?.min ?? 0;
      const max = props?.max ?? 25;
      if (props?.selectsRange) {
        const lo = readNumber(r, min, max);
        const hi = readNumber(r, min, max);
        return [lo, hi];
      }
      return readNumber(r, min, max);
    }

    case "timer":
      return r.readBit() ? formatTime(r.readVarint()) : null;

    case "grid": {
      const { rows, cols } = gridDimensions(component);
      const active: number[] = [];
      for (let i = 0; i < rows * cols; i++) {
        if (r.readBit()) active.push(i);
      }
      // Rebuild the exact shape GridInput.formatGridValue emits.
      return `${rows}x${cols}:[${active.join(",")}]`;
    }

    case "text": {
      if (!r.readBit()) return "";
      const length = r.readBits(8);
      return new TextDecoder().decode(r.readBytes(length));
    }

    case "autopath":
      return decodePath(r, pathVocabulary(props));

    default:
      return decodeField(r, { ...component, type: "text" });
  }
}

// ---------------------------------------------------------------------------
// Whole-payload codec
// ---------------------------------------------------------------------------

/**
 * Packs one match into bytes: [flags:1][field bits, zero-padded][crc8:1].
 *
 * `values` is keyed by field id, matching ScoutDataContext's match data map.
 */
export function encodeMatchBody(
  schema: Schema,
  values: Map<number, any>
): Uint8Array {
  const w = new BitWriter();
  w.writeBits(FLAG_NONE, 8);

  for (const field of encodableFields(schema)) {
    encodeField(w, field, values.get(field.id));
  }

  const body = w.toBytes();
  const out = new Uint8Array(body.length + 1);
  out.set(body, 0);
  out[body.length] = crc8(body);
  return out;
}

export interface DecodedMatch {
  /** Field id → decoded value. */
  values: Map<number, any>;
  /** False when the trailing CRC-8 did not match the body. */
  checksumOk: boolean;
}

export function decodeMatchBody(
  schema: Schema,
  payload: Uint8Array
): DecodedMatch {
  if (payload.length < 2) {
    throw new Error("Match payload too short");
  }

  const body = payload.subarray(0, payload.length - 1);

  // Verify before decoding. Corrupt bits can inflate a text length field and send
  // the reader off the end, so decoding first would surface a confusing RangeError
  // instead of the real problem.
  if (crc8(body) !== payload[payload.length - 1]) {
    return { values: new Map(), checksumOk: false };
  }

  const r = new BitReader(body);
  r.readBits(8); // flags — reserved, nothing to interpret yet

  const values = new Map<number, any>();
  try {
    for (const field of encodableFields(schema)) {
      values.set(field.id, decodeField(r, field));
    }
  } catch {
    // The checksum passed, so the bytes are intact and it is the schema that
    // disagrees — most likely an 8-hex-char schema hash collision.
    throw new Error(
      `Match payload does not match schema "${schema.name}": the field layout ran ` +
        `past the end of the payload. The QR was probably recorded with a different schema.`
    );
  }

  return { values, checksumOk: true };
}

/**
 * Bit cost of one match under a schema, without allocating the payload.
 * Used by the batch builder to pack codes right up to QR capacity.
 */
export function measureMatchBits(
  schema: Schema,
  values: Map<number, any>
): number {
  const w = new BitWriter();
  for (const field of encodableFields(schema)) {
    encodeField(w, field, values.get(field.id));
  }
  return w.bitLength;
}

/** Re-exported so callers do not need to reach into PathCodec for the path type. */
export type { AutoPathValue };
