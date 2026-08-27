import { describe, expect, it } from "vitest";
import {
  BatchEntry,
  MAX_BATCH_MATCHES,
  decodeBatchBody,
  encodeBatchBody,
} from "../../utils/BatchCodec";
import {
  BATCH_SIZE_BY_BREAKPOINT,
  MAX_BATCH_PAYLOAD_CHARS,
  QR_ALNUM_CAPACITY_V40_Q,
} from "../../utils/BatchBuilder";

function entry(deviceId: number, length: number, seed = 1): BatchEntry {
  const payload = new Uint8Array(length);
  for (let i = 0; i < length; i++) payload[i] = (i * seed + deviceId) & 0xff;
  return { deviceId, payload };
}

describe("encodeBatchBody / decodeBatchBody", () => {
  it("round-trips a single entry", () => {
    const entries = [entry(3, 24)];
    const decoded = decodeBatchBody(encodeBatchBody(entries));
    expect(decoded.checksumOk).toBe(true);
    expect(decoded.entries).toEqual(entries);
  });

  it("round-trips 30 heterogeneous entries", () => {
    const entries = Array.from({ length: 30 }, (_, i) =>
      entry((i % 6) + 1, 18 + (i % 11), i + 1)
    );
    const decoded = decodeBatchBody(encodeBatchBody(entries));
    expect(decoded.checksumOk).toBe(true);
    expect(decoded.entries).toEqual(entries);
  });

  it("preserves per-record device ids", () => {
    // A lead device's QR page can hold codes imported from several scout devices.
    const entries = [entry(1, 10), entry(6, 10), entry(255, 10)];
    const decoded = decodeBatchBody(encodeBatchBody(entries));
    expect(decoded.entries.map((e) => e.deviceId)).toEqual([1, 6, 255]);
  });

  it("round-trips entries whose length crosses a varint boundary", () => {
    const entries = [entry(1, 127), entry(2, 128), entry(3, 300)];
    const decoded = decodeBatchBody(encodeBatchBody(entries));
    expect(decoded.entries).toEqual(entries);
  });

  it("rejects an empty batch", () => {
    expect(() => encodeBatchBody([])).toThrow(/empty batch/);
  });

  it("rejects more than one byte's worth of matches", () => {
    const tooMany = Array.from({ length: MAX_BATCH_MATCHES + 1 }, () => entry(1, 4));
    expect(() => encodeBatchBody(tooMany)).toThrow(/at most/);
  });

  it("reports a checksum failure without throwing", () => {
    const payload = encodeBatchBody([entry(1, 20), entry(2, 20)]);
    payload[4] ^= 0xff;
    const decoded = decodeBatchBody(payload);
    expect(decoded.checksumOk).toBe(false);
    expect(decoded.entries).toEqual([]);
  });

  it("rejects a truncated payload", () => {
    expect(() => decodeBatchBody(new Uint8Array([0, 1]))).toThrow(/too short/);
  });
});

describe("batch size caps", () => {
  it("uses the screen-size table the product spec calls for", () => {
    expect(BATCH_SIZE_BY_BREAKPOINT.md).toBe(30);
    expect(BATCH_SIZE_BY_BREAKPOINT.sm).toBe(20);
    expect(BATCH_SIZE_BY_BREAKPOINT.xs).toBe(15);
  });

  /** Mirrors BatchBuilder's Base45 sizing: 2 bytes become 3 characters. */
  const charsFor = (matches: number, bytesEach: number) =>
    Math.ceil((3 + matches * (bytesEach + 4)) / 2) * 3;

  it("lets the 30-match screen cap bind for a lean schema", () => {
    // A schema without long text fields encodes to roughly 20 bytes per match, and
    // at that size the screen-size cap must be what limits the batch.
    expect(charsFor(30, 20)).toBeLessThan(MAX_BATCH_PAYLOAD_CHARS);
  });

  it("lets the capacity cap bind for a text-heavy schema", () => {
    // A match carrying a long comment cannot fit 30 to a code at level Q. This is
    // the case the second cap exists for, and the UI reports it.
    expect(charsFor(30, 120)).toBeGreaterThan(MAX_BATCH_PAYLOAD_CHARS);
  });

  it("stays within QR version 40 level Q alphanumeric capacity", () => {
    expect(MAX_BATCH_PAYLOAD_CHARS).toBeLessThan(QR_ALNUM_CAPACITY_V40_Q);
  });
});
