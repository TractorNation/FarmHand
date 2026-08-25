/**
 * Minimal MSB-first bit writer/reader used by the QR payload codecs.
 *
 * Bit order is most-significant-bit-first within each byte, and multi-bit integers
 * are written most-significant-bit-first. This is the conventional choice and the
 * one documented in docs/WIRE_FORMAT.md, so an external decoder can reimplement it
 * without reading this file.
 */

/** Largest width accepted by writeBits/readBits. */
export const MAX_FIXED_WIDTH = 30;

/**
 * Bits needed to encode a value in [0, count). Returns 0 when there is only one
 * possible value — a single-option field costs nothing on the wire.
 */
export function bitsForCount(count: number): number {
  if (count <= 1) return 0;
  return Math.ceil(Math.log2(count));
}

export class BitWriter {
  private bytes: number[] = [];
  /** Partially filled byte, left-aligned as bits arrive. */
  private current = 0;
  /** Bits currently held in `current` (0..7). */
  private used = 0;

  get bitLength(): number {
    return this.bytes.length * 8 + this.used;
  }

  writeBit(bit: boolean | 0 | 1): this {
    this.current = (this.current << 1) | (bit ? 1 : 0);
    this.used++;
    if (this.used === 8) {
      this.bytes.push(this.current);
      this.current = 0;
      this.used = 0;
    }
    return this;
  }

  /** Writes the low `count` bits of `value`, most significant first. */
  writeBits(value: number, count: number): this {
    if (count === 0) return this;
    if (count < 0 || count > MAX_FIXED_WIDTH) {
      throw new RangeError(
        `writeBits: width ${count} out of range 0..${MAX_FIXED_WIDTH} (use writeVarint)`
      );
    }
    const v = Math.trunc(value);
    if (v < 0 || v >= 2 ** count) {
      throw new RangeError(`writeBits: ${value} does not fit in ${count} bits`);
    }
    for (let i = count - 1; i >= 0; i--) {
      this.writeBit(((v >>> i) & 1) as 0 | 1);
    }
    return this;
  }

  /**
   * Unsigned LEB128-style varint: groups of 7 payload bits, least-significant
   * group first, each preceded by a continuation bit.
   *
   * Uses division rather than `>>>` so values above 2^31 still round-trip.
   */
  writeVarint(value: number): this {
    let v = Math.trunc(value);
    if (v < 0 || !Number.isFinite(v)) {
      throw new RangeError(`writeVarint: ${value} is not a non-negative integer`);
    }
    do {
      const chunk = v % 128;
      v = Math.floor(v / 128);
      this.writeBit(v > 0 ? 1 : 0);
      this.writeBits(chunk, 7);
    } while (v > 0);
    return this;
  }

  writeBytes(bytes: Uint8Array): this {
    for (const b of bytes) this.writeBits(b, 8);
    return this;
  }

  /** Pads with zero bits up to the next byte boundary. */
  align(): this {
    while (this.used !== 0) this.writeBit(0);
    return this;
  }

  /** Snapshot of the stream, zero-padded to a whole byte. Safe to call repeatedly. */
  toBytes(): Uint8Array {
    const out =
      this.used > 0
        ? [...this.bytes, (this.current << (8 - this.used)) & 0xff]
        : this.bytes;
    return new Uint8Array(out);
  }
}

export class BitReader {
  /** Absolute bit offset into `data`. */
  private pos = 0;

  constructor(private readonly data: Uint8Array) {}

  get bitPosition(): number {
    return this.pos;
  }

  get remainingBits(): number {
    return this.data.length * 8 - this.pos;
  }

  readBit(): 0 | 1 {
    if (this.pos >= this.data.length * 8) {
      throw new RangeError("BitReader: read past end of data");
    }
    const byte = this.data[this.pos >>> 3];
    const bit = (byte >>> (7 - (this.pos & 7))) & 1;
    this.pos++;
    return bit as 0 | 1;
  }

  readBits(count: number): number {
    if (count === 0) return 0;
    if (count < 0 || count > MAX_FIXED_WIDTH) {
      throw new RangeError(
        `readBits: width ${count} out of range 0..${MAX_FIXED_WIDTH}`
      );
    }
    let value = 0;
    for (let i = 0; i < count; i++) {
      value = value * 2 + this.readBit();
    }
    return value;
  }

  readVarint(): number {
    let result = 0;
    let multiplier = 1;
    for (;;) {
      const more = this.readBit();
      result += this.readBits(7) * multiplier;
      if (!more) return result;
      multiplier *= 128;
    }
  }

  readBytes(count: number): Uint8Array {
    const out = new Uint8Array(count);
    for (let i = 0; i < count; i++) out[i] = this.readBits(8);
    return out;
  }

  /** Skips forward to the next byte boundary. */
  align(): this {
    while (this.pos % 8 !== 0) this.pos++;
    return this;
  }
}
