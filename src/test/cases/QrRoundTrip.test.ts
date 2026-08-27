import { describe, expect, it } from "vitest";
import {
  buildBatchQrString,
  expandBatchQr,
  getSchemaHashFromQrString,
  parseQrHeader,
  rawMatchPayload,
} from "../../utils/QrUtils";
import { encodeBatchBody } from "../../utils/BatchCodec";
import { encodeBase45 } from "../../utils/Base45";

/**
 * The batch path, end to end.
 *
 * `rawMatchPayload` and `expandBatchQr` are documented as exact inverses of the batch
 * build, and that property is what makes "collect N matches into one code, scan it on
 * the lead device, get N saved matches back" safe. It has never been tested through
 * those two functions — `BatchCodec.test.ts` covers the body encoding one layer down,
 * but not the QR-string layer that wraps it, where the header and the Base45 hop live.
 *
 * None of this needs mocking: every function involved is pure. The `invoke`-backed
 * parts of QrUtils (rendering, saving) are not touched.
 */

const HASH = "b0f68211";

const entry = (deviceId: number, bytes: number[]) => ({
  deviceId,
  payload: Uint8Array.from(bytes),
});

/** Builds a batch QR string the way BatchBuilder does. */
function buildBatch(entries: { deviceId: number; payload: Uint8Array }[]) {
  return buildBatchQrString(HASH, encodeBase45(encodeBatchBody(entries)));
}

describe("batch round trip", () => {
  it("returns each match payload byte-identically", () => {
    // The property the whole batch feature rests on: a batched match must be the
    // same bytes as the original, or it decodes against the schema differently.
    const entries = [
      entry(1, [0x00, 0x11, 0x22]),
      entry(2, [0xff, 0xfe]),
      entry(3, [0x7f]),
    ];

    const expanded = expandBatchQr(buildBatch(entries));

    expect(expanded.matchStrings).toHaveLength(3);
    expanded.matchStrings.forEach((matchString, i) => {
      const raw = rawMatchPayload(matchString);
      expect(raw).not.toBeNull();
      expect(Array.from(raw!.payload)).toEqual(Array.from(entries[i].payload));
    });
  });

  it("preserves each record's own device id", () => {
    // A batch is stamped device 0; the real device id rides per record, and losing
    // it would misattribute every match in the batch to one scout.
    const entries = [entry(1, [1]), entry(6, [2]), entry(3, [3])];

    const expanded = expandBatchQr(buildBatch(entries));

    expect(expanded.matchStrings.map((s) => rawMatchPayload(s)!.deviceId)).toEqual([
      1, 6, 3,
    ]);
  });

  it("stamps the batch itself with device 0", () => {
    expect(parseQrHeader(buildBatch([entry(4, [1])]))!.deviceId).toBe(0);
  });

  it("carries the schema hash through to every expanded match", () => {
    const expanded = expandBatchQr(buildBatch([entry(1, [1]), entry(2, [2])]));

    expect(expanded.schemaHash).toBe(HASH);
    for (const matchString of expanded.matchStrings) {
      expect(getSchemaHashFromQrString(matchString)).toBe(HASH);
    }
  });

  it("reports a good checksum for an intact batch", () => {
    expect(expandBatchQr(buildBatch([entry(1, [1, 2, 3])])).checksumOk).toBe(true);
  });

  it("round-trips a single-entry batch", () => {
    const expanded = expandBatchQr(buildBatch([entry(1, [0xab])]));

    expect(expanded.matchStrings).toHaveLength(1);
    expect(Array.from(rawMatchPayload(expanded.matchStrings[0])!.payload)).toEqual([
      0xab,
    ]);
  });

  it("round-trips a full 255-match batch", () => {
    // The documented ceiling. The record count is one byte, so 255 is the boundary
    // where an off-by-one would wrap to zero.
    const entries = Array.from({ length: 255 }, (_, i) =>
      entry(i % 7, [i & 0xff, (i * 3) & 0xff])
    );

    const expanded = expandBatchQr(buildBatch(entries));

    expect(expanded.matchStrings).toHaveLength(255);
    expect(Array.from(rawMatchPayload(expanded.matchStrings[254])!.payload)).toEqual(
      Array.from(entries[254].payload)
    );
  });

  it("round-trips payloads containing every byte value", () => {
    const all = Uint8Array.from({ length: 256 }, (_, i) => i);
    const expanded = expandBatchQr(buildBatch([{ deviceId: 1, payload: all }]));

    expect(Array.from(rawMatchPayload(expanded.matchStrings[0])!.payload)).toEqual(
      Array.from(all)
    );
  });
});

describe("hash case folding", () => {
  it("writes the hash uppercase on the wire but reads it back lowercase", () => {
    // The wire stays inside the QR alphanumeric charset, which is uppercase-only;
    // parseQrHeader normalises so it compares against createSchemaHash output.
    const built = buildBatch([entry(1, [1])]);

    expect(built).toContain(HASH.toUpperCase());
    expect(built).not.toContain(HASH);
    expect(parseQrHeader(built)!.schemaHash).toBe(HASH);
  });

  it("keeps expanded match strings on the wire convention too", () => {
    const [matchString] = expandBatchQr(buildBatch([entry(1, [1])])).matchStrings;

    expect(matchString).toContain(HASH.toUpperCase());
    expect(getSchemaHashFromQrString(matchString)).toBe(HASH);
  });
});

describe("corruption", () => {
  it("reports a bad checksum rather than throwing", () => {
    // A misread batch must surface as "this scan failed", not as silently wrong
    // matches and not as a crash in the scanner dialog.
    const built = buildBatch([entry(1, [1, 2, 3]), entry(2, [4, 5])]);
    const header = parseQrHeader(built)!;

    // Flip one Base45 character in the payload.
    const flipped = header.payload.replace(/[0-9]/, (d) =>
      d === "0" ? "1" : "0"
    );
    const corrupted = built.replace(header.payload, flipped);

    const expanded = expandBatchQr(corrupted);
    expect(expanded.checksumOk).toBe(false);
  });

  it("rejects a string that is not a batch code", () => {
    expect(() => expandBatchQr(`FRMHND:M:${HASH.toUpperCase()}:1:ABC`)).toThrow(
      /not a farmhand batch/i
    );
    expect(() => expandBatchQr("https://example.com")).toThrow();
  });
});

describe("rawMatchPayload guards", () => {
  it("returns null for a batch code", () => {
    // Batch and match codes share a header shape; only the type tells them apart.
    expect(rawMatchPayload(buildBatch([entry(1, [1])]))).toBeNull();
  });

  it("returns null for a schema code", () => {
    expect(rawMatchPayload(`FRMHND:S:${HASH.toUpperCase()}:0:eJxLysxLBQAD1QIJ`))
      .toBeNull();
  });

  it("returns null for a string that is not a FarmHand code", () => {
    expect(rawMatchPayload("https://example.com")).toBeNull();
    expect(rawMatchPayload("")).toBeNull();
  });
});
