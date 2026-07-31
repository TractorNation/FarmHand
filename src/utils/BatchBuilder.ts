import { encodeBase45 } from "./Base45";
import { BatchEntry, encodeBatchBody } from "./BatchCodec";
import { buildBatchQrString, renderQrString } from "./QrUtils";

/**
 * Splits selected match codes into as few scannable batch QR codes as possible.
 *
 * Two independent caps apply:
 *
 * 1. **Screen size.** The generating device's screen decides how physically small
 *    each QR module renders, and an over-dense code is exactly what a weak tablet
 *    camera fails to read. Set by the caller from a breakpoint.
 * 2. **Encoded length.** A schema with long free-text comment fields can exceed QR
 *    capacity well below the screen-size cap, so chunks also close early on a
 *    conservative character budget.
 *
 * Whichever binds first wins, and the result reports the effective size so the UI
 * can say "3 codes (20 per code)" rather than silently dropping rows.
 */

/** Matches per code, keyed by the widest breakpoint the screen satisfies. */
export const BATCH_SIZE_BY_BREAKPOINT = {
  md: 30,
  sm: 20,
  xs: 15,
} as const;

/**
 * Hard capacity of a QR code at version 40, error-correction level Q, in
 * alphanumeric mode. Level Q is what core/qr.rs encodes at.
 */
export const QR_ALNUM_CAPACITY_V40_Q = 1852;

/** `FRMHND:B2:<8 hex>:0:` — subtracted from capacity to size the payload budget. */
const BATCH_HEADER_CHARS = 20;

/**
 * Character budget for one batch QR's payload.
 *
 * Set as high as level Q physically allows (minus the header and a small margin) so
 * that the screen-size cap is what binds in the normal case. A tighter budget would
 * silently override the requested 30/20/15 on every batch.
 *
 * Note this cap genuinely can bind below 30: at ~1.5 characters per byte, a level-Q
 * code holds roughly 1,200 payload bytes, so 30 matches only fit when each encodes
 * to about 40 bytes or less. Lean schemas clear that easily; a schema with long
 * free-text comments will not, and the builder reports when that happens.
 */
export const MAX_BATCH_PAYLOAD_CHARS =
  QR_ALNUM_CAPACITY_V40_Q - BATCH_HEADER_CHARS - 32;

export interface BatchChunk {
  /** The full QR string for this chunk. */
  data: string;
  /** How many matches it carries. */
  count: number;
}

export interface BuiltBatches {
  chunks: BatchChunk[];
  /** Cap that actually applied, for display. */
  effectiveSize: number;
  /** True when the length budget closed a chunk before the screen-size cap did. */
  limitedByCapacity: boolean;
}

/** Base45 expands 2 bytes into 3 characters, so ~1.5 chars per byte. */
function base45Length(byteLength: number): number {
  return Math.ceil(byteLength / 2) * 3;
}

export interface BuildBatchesOptions {
  schemaHash: string;
  entries: BatchEntry[];
  /** Max matches per code from the screen-size table. */
  maxPerCode: number;
}

export async function buildBatchQrCodes({
  schemaHash,
  entries,
  maxPerCode,
}: BuildBatchesOptions): Promise<BuiltBatches> {
  const groups: BatchEntry[][] = [];
  let current: BatchEntry[] = [];
  // 2 header bytes + 1 CRC byte, plus per-record overhead, approximated generously.
  let currentBytes = 3;
  let limitedByCapacity = false;

  for (const entry of entries) {
    const entryBytes = entry.payload.length + 4; // deviceId + varint + alignment
    const wouldExceedLength =
      base45Length(currentBytes + entryBytes) > MAX_BATCH_PAYLOAD_CHARS;
    const wouldExceedCount = current.length >= maxPerCode;

    if (current.length > 0 && (wouldExceedLength || wouldExceedCount)) {
      if (wouldExceedLength && !wouldExceedCount) limitedByCapacity = true;
      groups.push(current);
      current = [];
      currentBytes = 3;
    }

    current.push(entry);
    currentBytes += entryBytes;
  }
  if (current.length > 0) groups.push(current);

  const chunks: BatchChunk[] = [];
  for (const group of groups) {
    const payload = encodeBase45(encodeBatchBody(group));
    chunks.push({
      data: buildBatchQrString(schemaHash, payload),
      count: group.length,
    });
  }

  return {
    chunks,
    effectiveSize: chunks.length > 0 ? Math.max(...chunks.map((c) => c.count)) : 0,
    limitedByCapacity,
  };
}

/** Renders each chunk to an SVG for display. */
export async function renderBatchChunks(chunks: BatchChunk[]): Promise<string[]> {
  return await Promise.all(chunks.map((chunk) => renderQrString(chunk.data)));
}
