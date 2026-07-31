import { BitReader, BitWriter } from "./BitStream";
import { crc8 } from "./Base45";

/**
 * Multi-match batch container (QR type token "B2").
 *
 * At roughly 30-50 Base45 characters per match, one QR carries dozens, which turns
 * end-of-event transfer from one scan per match into two or three scans total.
 *
 * Layout:
 *   [flags: 1 byte][matchCount: 1 byte]
 *   matchCount x { [deviceId: 1 byte][byteLength: varint][match record, byte-aligned] }
 *   [crc8: 1 byte]
 *
 * Records are length-prefixed and byte-aligned so a reader can walk the batch
 * without re-deriving each record's width from the schema. Device id is per record
 * because the QR page may hold codes imported from other devices.
 */

export const BATCH_PAYLOAD_VERSION = 2;

/** matchCount is a single byte. */
export const MAX_BATCH_MATCHES = 255;

export interface BatchEntry {
  deviceId: number;
  /** A full match body as produced by encodeMatchBody. */
  payload: Uint8Array;
}

export function encodeBatchBody(entries: BatchEntry[]): Uint8Array {
  if (entries.length === 0) throw new Error("Cannot build an empty batch");
  if (entries.length > MAX_BATCH_MATCHES) {
    throw new Error(
      `A batch holds at most ${MAX_BATCH_MATCHES} matches, got ${entries.length}`
    );
  }

  const w = new BitWriter();
  w.writeBits(0, 8); // flags — reserved
  w.writeBits(entries.length, 8);

  for (const entry of entries) {
    w.writeBits(Math.max(0, Math.min(255, Math.trunc(entry.deviceId))), 8);
    w.writeVarint(entry.payload.length);
    w.align();
    w.writeBytes(entry.payload);
  }

  const body = w.toBytes();
  const out = new Uint8Array(body.length + 1);
  out.set(body, 0);
  out[body.length] = crc8(body);
  return out;
}

export interface DecodedBatch {
  entries: BatchEntry[];
  checksumOk: boolean;
}

export function decodeBatchBody(payload: Uint8Array): DecodedBatch {
  if (payload.length < 3) throw new Error("Batch payload too short");

  const body = payload.subarray(0, payload.length - 1);

  // Verified before parsing, for the same reason as match bodies: a corrupt length
  // prefix would otherwise send the reader off the end.
  if (crc8(body) !== payload[payload.length - 1]) {
    return { entries: [], checksumOk: false };
  }

  const r = new BitReader(body);
  r.readBits(8); // flags
  const count = r.readBits(8);

  const entries: BatchEntry[] = [];
  for (let i = 0; i < count; i++) {
    const deviceId = r.readBits(8);
    const length = r.readVarint();
    r.align();
    entries.push({ deviceId, payload: r.readBytes(length) });
  }

  return { entries, checksumOk: true };
}
