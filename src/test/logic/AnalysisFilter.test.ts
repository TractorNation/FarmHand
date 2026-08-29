import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Which saved codes an analysis actually covers.
 *
 * Two filter conventions meet here and they are easy to invert: an **empty** team or
 * match selection means "no filter", not "match nothing" — getting that backwards
 * empties every chart in the app. Codes are also filtered by schema hash *before*
 * decoding, because a bit-packed payload can only be read with the schema it was
 * recorded against.
 *
 * Only `decodeQR` is mocked; `getSchemaHashFromQrString` stays real so the hash
 * filtering is exercised against genuine wire strings.
 */

const decode = vi.hoisted(() => ({ decodeQR: vi.fn() }));

vi.mock("../../utils/QrUtils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../utils/QrUtils")>()),
  decodeQR: decode.decodeQR,
}));

const { filterQrCodesForAnalysis } = await import("../../utils/AnalysisUtils");

const HASH = "b0f68211";
const OTHER_HASH = "deadbeef";

const SCHEMA: Schema = {
  name: "Fixture",
  sections: [
    {
      title: "Match Info",
      fields: [
        { id: 0, name: "Match Number", type: "number" },
        { id: 1, name: "Team Number", type: "number" },
      ],
    },
    {
      title: "Scoring",
      fields: [{ id: 100, name: "Points", type: "counter" }],
    },
  ],
} as unknown as Schema;

/** A schema with no Team Number field, so a team filter cannot be honoured. */
const NO_TEAM_SCHEMA: Schema = {
  name: "No Team",
  sections: [{ title: "Only", fields: [{ id: 0, name: "Points", type: "counter" }] }],
} as unknown as Schema;

const code = (name: string, hash = HASH, archived = false): QrCode => ({
  name,
  data: `FRMHND:M:${hash.toUpperCase()}:1:PAYLOAD`,
  image: "<svg/>",
  archived,
});

/** Positional data in orderedFields order: [Match Number, Team Number, Points]. */
const decoded = (match: unknown, team: unknown, points = 10) => ({
  deviceId: 1,
  type: "match" as const,
  schemaHash: HASH,
  checksumOk: true,
  data: [match, team, points],
});

const analysis = (over: Partial<Analysis> = {}) =>
  ({
    schemaHash: HASH,
    selectedTeams: [],
    selectedMatches: [],
    ...over,
  }) as Analysis;

beforeEach(() => {
  vi.clearAllMocks();
  decode.decodeQR.mockResolvedValue(decoded(1, 254));
});

describe("no filters selected", () => {
  it("includes every matching code", () => {
    // Empty selections mean "everything", not "nothing".
    return expect(
      filterQrCodesForAnalysis([code("a"), code("b")], analysis(), SCHEMA)
    ).resolves.toHaveLength(2);
  });
});

describe("schema hash", () => {
  it("excludes a code recorded against a different schema", async () => {
    const result = await filterQrCodesForAnalysis(
      [code("a", HASH), code("b", OTHER_HASH)],
      analysis(),
      SCHEMA
    );

    expect(result.map((r) => r.qr.name)).toEqual(["a"]);
  });

  it("does not attempt to decode a mismatched code", async () => {
    // Decoding against the wrong schema is exactly the silent-corruption path the
    // hash check exists to prevent, so it must be filtered *before* decodeQR.
    await filterQrCodesForAnalysis([code("a", OTHER_HASH)], analysis(), SCHEMA);
    expect(decode.decodeQR).not.toHaveBeenCalled();
  });

  it("excludes a code whose data is not a FarmHand string", async () => {
    const junk: QrCode = { name: "junk", data: "https://example.com", image: "" };
    expect(await filterQrCodesForAnalysis([junk], analysis(), SCHEMA)).toEqual([]);
  });
});

describe("archived codes", () => {
  it("are excluded", async () => {
    const result = await filterQrCodesForAnalysis(
      [code("live"), code("old", HASH, true)],
      analysis(),
      SCHEMA
    );

    expect(result.map((r) => r.qr.name)).toEqual(["live"]);
  });
});

describe("team filter", () => {
  it("keeps only the selected teams", async () => {
    decode.decodeQR
      .mockResolvedValueOnce(decoded(1, 254))
      .mockResolvedValueOnce(decoded(2, 1678));

    const result = await filterQrCodesForAnalysis(
      [code("a"), code("b")],
      analysis({ selectedTeams: [254] }),
      SCHEMA
    );

    expect(result.map((r) => r.qr.name)).toEqual(["a"]);
  });

  it("compares teams numerically, so a stored string still matches", async () => {
    // Team Number arrives as a string from a TBA autocomplete and as a number from a
    // plain input; the filter stores numbers.
    decode.decodeQR.mockResolvedValue(decoded(1, "254"));

    const result = await filterQrCodesForAnalysis(
      [code("a")],
      analysis({ selectedTeams: [254] }),
      SCHEMA
    );

    expect(result).toHaveLength(1);
  });

  it("excludes a code with no team recorded", async () => {
    decode.decodeQR.mockResolvedValue(decoded(1, null));

    expect(
      await filterQrCodesForAnalysis(
        [code("a")],
        analysis({ selectedTeams: [254] }),
        SCHEMA
      )
    ).toEqual([]);
  });

  it("excludes everything when the schema has no Team Number field", async () => {
    // There is no way to honour the filter, and including unfiltered rows would
    // silently widen the analysis.
    decode.decodeQR.mockResolvedValue({ ...decoded(1, 254), data: [10] });

    expect(
      await filterQrCodesForAnalysis(
        [code("a")],
        analysis({ selectedTeams: [254] }),
        NO_TEAM_SCHEMA
      )
    ).toEqual([]);
  });
});

describe("match filter", () => {
  it("compares matches as strings", async () => {
    // The asymmetry worth pinning: teams compare as numbers, matches as strings,
    // because a match label can be "Qual-1" as well as "7".
    decode.decodeQR
      .mockResolvedValueOnce(decoded("Qual-1", 254))
      .mockResolvedValueOnce(decoded("Qual-2", 254));

    const result = await filterQrCodesForAnalysis(
      [code("a"), code("b")],
      analysis({ selectedMatches: ["Qual-1"] }),
      SCHEMA
    );

    expect(result.map((r) => r.qr.name)).toEqual(["a"]);
  });

  it("matches a numeric match number stored as a number", async () => {
    decode.decodeQR.mockResolvedValue(decoded(7, 254));

    expect(
      await filterQrCodesForAnalysis(
        [code("a")],
        analysis({ selectedMatches: ["7"] }),
        SCHEMA
      )
    ).toHaveLength(1);
  });

  it("excludes a code with no match recorded", async () => {
    decode.decodeQR.mockResolvedValue(decoded(null, 254));

    expect(
      await filterQrCodesForAnalysis(
        [code("a")],
        analysis({ selectedMatches: ["7"] }),
        SCHEMA
      )
    ).toEqual([]);
  });
});

describe("combined filters", () => {
  it("requires both team and match to match", async () => {
    decode.decodeQR
      .mockResolvedValueOnce(decoded("7", 254))
      .mockResolvedValueOnce(decoded("7", 1678))
      .mockResolvedValueOnce(decoded("8", 254));

    const result = await filterQrCodesForAnalysis(
      [code("a"), code("b"), code("c")],
      analysis({ selectedTeams: [254], selectedMatches: ["7"] }),
      SCHEMA
    );

    expect(result.map((r) => r.qr.name)).toEqual(["a"]);
  });
});

describe("decode failures", () => {
  it("drops a code that fails to decode rather than aborting the analysis", async () => {
    // One corrupt code must not empty the whole chart.
    decode.decodeQR
      .mockRejectedValueOnce(new Error("checksum failed"))
      .mockResolvedValueOnce(decoded(1, 254));

    const result = await filterQrCodesForAnalysis(
      [code("bad"), code("good")],
      analysis(),
      SCHEMA
    );

    expect(result.map((r) => r.qr.name)).toEqual(["good"]);
  });

  it("drops a decode that returned no data", async () => {
    decode.decodeQR.mockResolvedValue({ ...decoded(1, 254), data: undefined });

    expect(await filterQrCodesForAnalysis([code("a")], analysis(), SCHEMA)).toEqual(
      []
    );
  });
});
