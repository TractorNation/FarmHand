import { describe, expect, it } from "vitest";
import { BitReader, BitWriter, bitsForCount } from "./BitStream";

describe("bitsForCount", () => {
  it.each([
    [0, 0],
    [1, 0],
    [2, 1],
    [3, 2],
    [4, 2],
    [5, 3],
    [8, 3],
    [9, 4],
  ])("needs %i bits for %i values", (count, expected) => {
    expect(bitsForCount(count)).toBe(expected);
  });
});

describe("BitWriter / BitReader", () => {
  it("round-trips single bits", () => {
    const bits = [1, 0, 1, 1, 0, 0, 0, 1, 1, 0, 1] as const;
    const w = new BitWriter();
    bits.forEach((b) => w.writeBit(b));

    const r = new BitReader(w.toBytes());
    expect(bits.map(() => r.readBit())).toEqual([...bits]);
  });

  it("packs MSB-first within a byte", () => {
    const w = new BitWriter();
    w.writeBit(1).writeBit(0).writeBit(1);
    // 101 padded right with zeros => 0b10100000
    expect(w.toBytes()).toEqual(new Uint8Array([0b10100000]));
  });

  it("round-trips fixed-width integers at every width", () => {
    const w = new BitWriter();
    const written: [number, number][] = [];
    for (let width = 1; width <= 30; width++) {
      const value = (2 ** width - 1) % 1237; // arbitrary in-range value
      written.push([value, width]);
      w.writeBits(value, width);
    }

    const r = new BitReader(w.toBytes());
    for (const [value, width] of written) {
      expect(r.readBits(width)).toBe(value);
    }
  });

  it("treats width 0 as writing nothing", () => {
    const w = new BitWriter();
    w.writeBits(0, 0);
    expect(w.bitLength).toBe(0);
    expect(new BitReader(new Uint8Array([0xff])).readBits(0)).toBe(0);
  });

  it("rejects values that do not fit the declared width", () => {
    expect(() => new BitWriter().writeBits(8, 3)).toThrow(/does not fit/);
    expect(() => new BitWriter().writeBits(-1, 3)).toThrow(/does not fit/);
  });

  it("rejects widths beyond the fixed-width limit", () => {
    expect(() => new BitWriter().writeBits(1, 31)).toThrow(/out of range/);
  });

  it("round-trips varints across group boundaries", () => {
    const values = [
      0, 1, 42, 127, 128, 129, 255, 256, 16383, 16384, 100000, 2 ** 31,
      Number.MAX_SAFE_INTEGER,
    ];
    const w = new BitWriter();
    values.forEach((v) => w.writeVarint(v));

    const r = new BitReader(w.toBytes());
    expect(values.map(() => r.readVarint())).toEqual(values);
  });

  it("round-trips bytes", () => {
    const payload = new Uint8Array([0, 1, 127, 128, 254, 255]);
    const w = new BitWriter();
    w.writeBit(1); // force a non-aligned start
    w.writeBytes(payload);

    const r = new BitReader(w.toBytes());
    expect(r.readBit()).toBe(1);
    expect(r.readBytes(payload.length)).toEqual(payload);
  });

  it("aligns to byte boundaries symmetrically", () => {
    const w = new BitWriter();
    w.writeBits(0b101, 3).align().writeBits(0xab, 8);
    expect(w.toBytes()).toEqual(new Uint8Array([0b10100000, 0xab]));

    const r = new BitReader(w.toBytes());
    expect(r.readBits(3)).toBe(0b101);
    r.align();
    expect(r.readBits(8)).toBe(0xab);
  });

  it("toBytes is repeatable and non-destructive", () => {
    const w = new BitWriter();
    w.writeBits(0b1011, 4);
    expect(w.toBytes()).toEqual(w.toBytes());
    w.writeBits(0b1, 1);
    expect(w.bitLength).toBe(5);
  });

  it("throws rather than returning garbage past the end", () => {
    const r = new BitReader(new Uint8Array([0xff]));
    r.readBits(8);
    expect(() => r.readBit()).toThrow(/past end/);
  });

  it("reports remaining bits", () => {
    const r = new BitReader(new Uint8Array([0, 0]));
    expect(r.remainingBits).toBe(16);
    r.readBits(5);
    expect(r.remainingBits).toBe(11);
  });
});
