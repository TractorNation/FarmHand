/**
 * Base45 (RFC 9285).
 *
 * Chosen over Base64 because every character is inside the QR alphanumeric
 * charset, which QR encodes at 5.5 bits/char instead of the 8 bits/char that byte
 * mode spends. Net cost is ~8.25 bits per payload byte versus Base64's ~10.67 — a
 * ~23% reduction in QR modules for the same data.
 *
 * Note the alphabet contains both ':' and ' '. Any container that embeds Base45
 * must therefore not split on those characters; see QrUtils' parse-by-offset.
 */

const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";

const DECODE_MAP: Record<string, number> = {};
for (let i = 0; i < ALPHABET.length; i++) DECODE_MAP[ALPHABET[i]] = i;

export function encodeBase45(bytes: Uint8Array): string {
  let out = "";

  let i = 0;
  for (; i + 1 < bytes.length; i += 2) {
    // Two bytes become three base-45 digits, least significant first.
    const n = bytes[i] * 256 + bytes[i + 1];
    out += ALPHABET[n % 45];
    out += ALPHABET[Math.floor(n / 45) % 45];
    out += ALPHABET[Math.floor(n / 2025)];
  }

  if (i < bytes.length) {
    // Odd trailing byte becomes two digits.
    const n = bytes[i];
    out += ALPHABET[n % 45];
    out += ALPHABET[Math.floor(n / 45)];
  }

  return out;
}

export function decodeBase45(text: string): Uint8Array {
  if (text.length % 3 === 1) {
    throw new Error(`Invalid Base45 length ${text.length} (length % 3 === 1)`);
  }

  const digits = new Array<number>(text.length);
  for (let i = 0; i < text.length; i++) {
    const v = DECODE_MAP[text[i]];
    if (v === undefined) {
      throw new Error(`Invalid Base45 character ${JSON.stringify(text[i])}`);
    }
    digits[i] = v;
  }

  const out: number[] = [];

  let i = 0;
  for (; i + 2 < digits.length; i += 3) {
    const n = digits[i] + digits[i + 1] * 45 + digits[i + 2] * 2025;
    if (n > 0xffff) {
      throw new Error(`Invalid Base45 triplet at ${i}: decodes to ${n} > 65535`);
    }
    out.push(n >>> 8, n & 0xff);
  }

  if (i < digits.length) {
    const n = digits[i] + digits[i + 1] * 45;
    if (n > 0xff) {
      throw new Error(`Invalid Base45 pair at ${i}: decodes to ${n} > 255`);
    }
    out.push(n);
  }

  return new Uint8Array(out);
}

/**
 * CRC-8/ATM: polynomial x^8 + x^2 + x + 1 (0x07), init 0x00, no reflection, no
 * final XOR.
 *
 * Redundant with the QR code's own Reed-Solomon error correction — its job is to
 * catch encoder/decoder drift and schema-hash collisions, not camera noise.
 */
export function crc8(bytes: Uint8Array): number {
  let crc = 0;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x80 ? ((crc << 1) ^ 0x07) & 0xff : (crc << 1) & 0xff;
    }
  }
  return crc;
}
