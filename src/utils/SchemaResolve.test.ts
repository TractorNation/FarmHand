import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Resolving a match code's schema from the 8-character hash it carries.
 *
 * This is the single point where a wrong answer is worse than no answer: a payload
 * decoded against a structurally different schema does not error, it yields values
 * attributed to the wrong fields. Only the CRC and a layout-overrun check stand behind
 * it, and neither catches a schema that happens to have a compatible bit layout.
 *
 * The three lookups exist because the same schema can legitimately have two hashes —
 * an imported copy is normalised by minifySchema and so hashes differently from the
 * device that stamped the codes.
 */

const wire = vi.hoisted(() => ({ createSchemaHash: vi.fn() }));
const fs = vi.hoisted(() => ({ exists: vi.fn(), readTextFile: vi.fn() }));

vi.mock("./SchemaWire", () => wire);
vi.mock("@tauri-apps/plugin-fs", () => ({
  ...fs,
  mkdir: vi.fn(),
  readDir: vi.fn(),
  BaseDirectory: { AppLocalData: 1 },
}));

const { getSchemaFromHash } = await import("./SchemaUtils");

const schema = (name: string): Schema =>
  ({ name, sections: [] }) as unknown as Schema;

const meta = (
  name: string,
  originHash?: string
): SchemaMetaData =>
  ({
    name,
    path: `schemas/${name}.json`,
    schema: schema(name),
    type: "generated",
    originHash,
  }) as SchemaMetaData;

beforeEach(() => {
  vi.clearAllMocks();
  fs.exists.mockResolvedValue(false);
});

describe("recorded origin hash", () => {
  it("resolves a schema imported from another device", () => {
    // The imported copy's own hash differs from the sender's, so the sender's hash is
    // recorded on import. Without this, every code from that device is unreadable.
    return expect(
      getSchemaFromHash("aaaaaaaa", [meta("Imported", "aaaaaaaa")])
    ).resolves.toEqual(schema("Imported"));
  });

  it("wins without computing any local hashes", async () => {
    await getSchemaFromHash("aaaaaaaa", [meta("Imported", "aaaaaaaa")]);
    expect(wire.createSchemaHash).not.toHaveBeenCalled();
  });

  it("ignores a non-matching origin hash", async () => {
    wire.createSchemaHash.mockResolvedValue("cccccccc");

    expect(
      await getSchemaFromHash("aaaaaaaa", [meta("Other", "bbbbbbbb")])
    ).toBeNull();
  });
});

describe("locally computed hash", () => {
  it("resolves a schema authored on this device", async () => {
    wire.createSchemaHash.mockResolvedValue("bbbbbbbb");

    expect(await getSchemaFromHash("bbbbbbbb", [meta("Local")])).toEqual(
      schema("Local")
    );
  });

  it("picks the matching schema out of several", async () => {
    wire.createSchemaHash
      .mockResolvedValueOnce("11111111")
      .mockResolvedValueOnce("22222222")
      .mockResolvedValueOnce("33333333");

    expect(
      await getSchemaFromHash("22222222", [
        meta("First"),
        meta("Second"),
        meta("Third"),
      ])
    ).toEqual(schema("Second"));
  });
});

describe("revision archive", () => {
  it("resolves a hash from a superseded revision", async () => {
    // Editing a schema mints a new identity and strands codes recorded under the old
    // one. The archive returns the exact revision that produced the hash.
    wire.createSchemaHash.mockResolvedValue("current0");
    fs.exists.mockResolvedValue(true);
    fs.readTextFile.mockResolvedValue(JSON.stringify(schema("Old Revision")));

    expect(await getSchemaFromHash("old00000", [meta("Current")])).toEqual(
      schema("Old Revision")
    );
    expect(fs.readTextFile).toHaveBeenCalledWith(
      "schemas/revisions/old00000.json",
      expect.anything()
    );
  });

  it("returns the archived revision rather than the current schema", async () => {
    // Resolving an old hash onto today's schema would decode the payload against a
    // different field layout — silently wrong data, which is worse than failing.
    wire.createSchemaHash.mockResolvedValue("current0");
    fs.exists.mockResolvedValue(true);
    fs.readTextFile.mockResolvedValue(JSON.stringify(schema("Old Revision")));

    const resolved = await getSchemaFromHash("old00000", [meta("Current")]);
    expect(resolved?.name).not.toBe("Current");
  });
});

describe("no match", () => {
  it("returns null when all three lookups miss", async () => {
    wire.createSchemaHash.mockResolvedValue("bbbbbbbb");

    expect(await getSchemaFromHash("unknown0", [meta("Local")])).toBeNull();
  });

  it("returns null when there are no schemas at all", async () => {
    expect(await getSchemaFromHash("aaaaaaaa", [])).toBeNull();
  });

  it("returns null rather than throwing when the archive is unreadable", async () => {
    // A corrupt revision file must not take down the decode path. The failure is
    // logged; silence it so a real failure stays readable.
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      wire.createSchemaHash.mockResolvedValue("bbbbbbbb");
      fs.exists.mockResolvedValue(true);
      fs.readTextFile.mockResolvedValue("{ not json");

      expect(await getSchemaFromHash("old00000", [meta("Local")])).toBeNull();
      expect(logged).toHaveBeenCalled();
    } finally {
      logged.mockRestore();
    }
  });
});

describe("lookup order", () => {
  it("prefers the recorded origin hash over a local hash collision", async () => {
    // If both could answer, the recorded hash is the authoritative one — it is what
    // the sending device actually stamped into the codes.
    wire.createSchemaHash.mockResolvedValue("shared00");

    expect(
      await getSchemaFromHash("shared00", [
        meta("Imported", "shared00"),
        meta("Local"),
      ])
    ).toEqual(schema("Imported"));
  });

  it("only consults the archive after both in-memory lookups miss", async () => {
    wire.createSchemaHash.mockResolvedValue("bbbbbbbb");

    await getSchemaFromHash("bbbbbbbb", [meta("Local")]);
    expect(fs.exists).not.toHaveBeenCalled();
  });
});
