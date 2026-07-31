import { describe, expect, it } from "vitest";
import { EmbedDataInSvg, GetDescFromSvg } from "./svgPayload";

/**
 * A saved QR code is an SVG that carries its own source string in a `<desc>` CDATA
 * block, so one file is both the picture and the data. If this pair stops agreeing,
 * every already-saved code on the device becomes an image of data nobody can read —
 * there is no second copy to fall back to.
 */

const SVG =
  '<?xml version="1.0" standalone="yes"?><svg xmlns="http://www.w3.org/2000/svg" width="265" height="265"><rect x="0" y="0" width="10" height="10"/></svg>';

/** A real match string as the app writes it. */
const MATCH_DATA = "FRMHND:M2:B0F68211:6:%20M13O+14%5:639/RL";

const code = (data: string, image = SVG): QrCode => ({
  name: "254-Qual-1-1700000000000.svg",
  data,
  image,
});

describe("round trip", () => {
  it("reads back exactly what was embedded", () => {
    const saved = EmbedDataInSvg(code(MATCH_DATA));
    expect(GetDescFromSvg(saved)).toBe(MATCH_DATA);
  });

  it("keeps the SVG renderable — the picture survives the embed", () => {
    const saved = EmbedDataInSvg(code(MATCH_DATA));
    expect(saved).toContain("<svg");
    expect(saved).toContain("</svg>");
    expect(saved).toContain("<rect");
    expect(saved.indexOf("<desc>")).toBeGreaterThan(saved.indexOf("<svg"));
  });

  it("round-trips a schema code, whose payload is base64 rather than Base45", () => {
    const schemaData = "FRMHND:S2:B0F68211:0:eJxLysxLBQAD1QIJ+a/w==";
    const saved = EmbedDataInSvg(code(schemaData));
    expect(GetDescFromSvg(saved)).toBe(schemaData);
  });

  it("survives a re-embed rather than accumulating desc blocks", () => {
    // Re-saving a code (archive, rename, scanned-state change) runs this again over
    // an SVG that already carries a payload. Two desc blocks would make the reader
    // return whichever came first — silently the stale one.
    const once = EmbedDataInSvg(code(MATCH_DATA));
    const twice = EmbedDataInSvg(code("FRMHND:M2:DEADBEEF:1:UPDATED", once));

    expect(twice.match(/<desc>/g)).toHaveLength(1);
    expect(GetDescFromSvg(twice)).toBe("FRMHND:M2:DEADBEEF:1:UPDATED");
  });
});

describe("payload charset", () => {
  it("cannot contain the CDATA terminator, which is why no escaping is needed", () => {
    // GetDescFromSvg matches lazily up to the first "]]>", so a payload containing
    // that sequence would truncate. It provably cannot: Base45 is limited to
    // "0-9 A-Z $%*+-./: " and base64 to "A-Za-z0-9+/=", and neither includes ']'
    // or '>'. This assertion is the guard — if a future wire format widens the
    // alphabet, this fails and the escaping question comes back.
    const BASE45_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";
    const BASE64_ALPHABET =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

    for (const alphabet of [BASE45_ALPHABET, BASE64_ALPHABET]) {
      expect(alphabet).not.toContain("]");
      expect(alphabet).not.toContain(">");
    }

    const saved = EmbedDataInSvg(code(`FRMHND:M2:AAAAAAAA:0:${BASE45_ALPHABET}`));
    expect(GetDescFromSvg(saved)).toBe(
      `FRMHND:M2:AAAAAAAA:0:${BASE45_ALPHABET}`
    );
  });
});

describe("GetDescFromSvg", () => {
  it("returns empty string when the SVG carries no payload", () => {
    expect(GetDescFromSvg(SVG)).toBe("");
  });

  it("ignores a plain desc that is not a CDATA payload", () => {
    // A desc written by another tool is a description, not our data.
    expect(GetDescFromSvg("<svg><desc>A QR code</desc></svg>")).toBe("");
  });

  it("returns empty string for content that is not an SVG at all", () => {
    expect(GetDescFromSvg("")).toBe("");
    expect(GetDescFromSvg("not an svg")).toBe("");
  });
});

describe("EmbedDataInSvg guards", () => {
  it("returns the image untouched when there is no data to embed", () => {
    expect(EmbedDataInSvg(code(""))).toBe(SVG);
  });

  it("returns the empty image unchanged rather than fabricating an SVG", () => {
    expect(EmbedDataInSvg(code(MATCH_DATA, ""))).toBe("");
  });

  it("leaves content with no opening svg tag alone", () => {
    expect(EmbedDataInSvg(code(MATCH_DATA, "garbage"))).toBe("garbage");
  });
});
