import { describe, expect, it } from "vitest";
import { crc8, decodeBase45, encodeBase45 } from "../../utils/Base45";

const utf8 = (s: string) => new TextEncoder().encode(s);
const str = (b: Uint8Array) => new TextDecoder().decode(b);

describe("Base45", () => {
  // Test vectors from RFC 9285 section 4.4.
  it.each([
    ["AB", "BB8"],
    ["Hello!!", "%69 VD92EX0"],
    ["base-45", "UJCLQE7W581"],
    ["ietf!", "QED8WEX0"],
  ])("encodes %j to %j per RFC 9285", (input, expected) => {
    expect(encodeBase45(utf8(input))).toBe(expected);
  });

  it.each([
    ["QED8WEX0", "ietf!"],
    ["BB8", "AB"],
    ["%69 VD92EX0", "Hello!!"],
  ])("decodes %j to %j", (input, expected) => {
    expect(str(decodeBase45(input))).toBe(expected);
  });

  it("round-trips every byte value", () => {
    const all = new Uint8Array(256);
    for (let i = 0; i < 256; i++) all[i] = i;
    expect(decodeBase45(encodeBase45(all))).toEqual(all);
  });

  it("round-trips odd and even lengths", () => {
    for (let len = 0; len <= 40; len++) {
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) bytes[i] = (i * 37 + 11) & 0xff;
      expect(decodeBase45(encodeBase45(bytes))).toEqual(bytes);
    }
  });

  it("produces only QR-alphanumeric characters", () => {
    const bytes = new Uint8Array(512);
    for (let i = 0; i < bytes.length; i++) bytes[i] = (i * 91) & 0xff;
    // The QR alphanumeric charset, which is what buys the 5.5 bits/char rate.
    expect(encodeBase45(bytes)).toMatch(/^[0-9A-Z $%*+\-./:]*$/);
  });

  it("rejects a length that cannot be valid", () => {
    expect(() => decodeBase45("BB8Q")).toThrow(/length/);
  });

  it("rejects characters outside the alphabet", () => {
    expect(() => decodeBase45("bb8")).toThrow(/Invalid Base45 character/);
  });

  it("rejects triplets that overflow two bytes", () => {
    // ':' is 44, the largest digit; 44 + 44*45 + 44*2025 = 91124 > 65535.
    expect(() => decodeBase45(":::")).toThrow(/65535/);
  });
});

describe("crc8", () => {
  it("returns 0 for empty input", () => {
    expect(crc8(new Uint8Array(0))).toBe(0);
  });

  it("matches the known CRC-8/ATM check value for '123456789'", () => {
    expect(crc8(utf8("123456789"))).toBe(0xf4);
  });

  it("detects a single-bit change", () => {
    const a = utf8("frmhnd match payload");
    const b = utf8("frmhnd match payloae");
    expect(crc8(a)).not.toBe(crc8(b));
  });
});
