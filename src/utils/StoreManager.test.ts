import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The persistence layer, exercised against an in-memory `@tauri-apps/plugin-store`.
 *
 * Mocking the plugin rather than `StoreManager` itself is the point: the logic worth
 * testing *is* `StoreManager`'s — the two-tier folder index, the self-heal, and the
 * two different conventions it uses for booleans. All of it is untested today, and
 * every context and hook in the app sits on top of it.
 *
 * `store` and `initPromise` are module-level singletons, so each test re-imports the
 * module after `vi.resetModules()` to get a clean one.
 */

const backing = vi.hoisted(() => new Map<string, unknown>());

vi.mock("@tauri-apps/plugin-store", () => ({
  Store: {
    load: async () => ({
      get: async (key: string) => backing.get(key),
      set: async (key: string, value: unknown) => {
        backing.set(key, value);
      },
      delete: async (key: string) => {
        backing.delete(key);
      },
      clear: async () => {
        backing.clear();
      },
    }),
  },
}));

/** Fresh module instance, so the cached `store` singleton does not leak between tests. */
async function freshStore() {
  vi.resetModules();
  return await import("./StoreManager");
}

const folder = (id: string, qrCodes: string[] = [], archived = false): QrFolder => ({
  id,
  name: `Folder ${id}`,
  createdAt: 0,
  qrCodes,
  archived,
});

/** Writes the two-tier folder representation directly, bypassing saveFolder. */
function seedFolders(...folders: QrFolder[]) {
  backing.set("folders::list", JSON.stringify(folders.map((f) => f.id)));
  for (const f of folders) {
    backing.set(`folders::${f.id}`, JSON.stringify(f));
  }
}

beforeEach(() => {
  backing.clear();
  vi.clearAllMocks();
});

describe("primitive access", () => {
  it("round-trips a value", async () => {
    const { default: StoreManager } = await freshStore();

    await StoreManager.set("k", "v");
    expect(await StoreManager.get("k")).toBe("v");
  });

  it("returns undefined for a key that was never written", async () => {
    const { default: StoreManager } = await freshStore();
    expect(await StoreManager.get("missing")).toBeUndefined();
  });

  it("removes a key", async () => {
    const { default: StoreManager } = await freshStore();

    await StoreManager.set("k", "v");
    await StoreManager.remove("k");
    expect(await StoreManager.get("k")).toBeUndefined();
  });
});

describe("code flags", () => {
  it("stores archived as the string \"true\" and absence as false", async () => {
    // There is no "false" on disk — unarchiving deletes the key. Anything other than
    // the exact string "true" therefore reads as false.
    const { default: StoreManager, StoreKeys } = await freshStore();

    expect(await StoreManager.isQrCodeArchived("a.svg")).toBe(false);

    await StoreManager.archiveQrCode("a.svg");
    expect(backing.get(StoreKeys.code.archived("a.svg"))).toBe("true");
    expect(await StoreManager.isQrCodeArchived("a.svg")).toBe(true);

    await StoreManager.unarchiveQrCode("a.svg");
    expect(backing.has(StoreKeys.code.archived("a.svg"))).toBe(false);
    expect(await StoreManager.isQrCodeArchived("a.svg")).toBe(false);
  });

  it("reads any other stored string as false", async () => {
    const { default: StoreManager, StoreKeys } = await freshStore();

    backing.set(StoreKeys.code.archived("a.svg"), "false");
    expect(await StoreManager.isQrCodeArchived("a.svg")).toBe(false);

    backing.set(StoreKeys.code.archived("a.svg"), "TRUE");
    expect(await StoreManager.isQrCodeArchived("a.svg")).toBe(false);
  });

  it("tracks scanned independently of archived", async () => {
    const { default: StoreManager } = await freshStore();

    await StoreManager.markQrCodeAsScanned("a.svg");
    expect(await StoreManager.isQrCodeScanned("a.svg")).toBe(true);
    expect(await StoreManager.isQrCodeArchived("a.svg")).toBe(false);

    await StoreManager.markQrCodeAsUnscanned("a.svg");
    expect(await StoreManager.isQrCodeScanned("a.svg")).toBe(false);
  });
});

describe("getFolders", () => {
  it("returns nothing when no folder list exists", async () => {
    const { default: StoreManager } = await freshStore();
    expect(await StoreManager.getFolders()).toEqual([]);
  });

  it("reads folders through the two-tier index", async () => {
    // One key holds the id list, one key per folder holds the object.
    const { default: StoreManager } = await freshStore();
    seedFolders(folder("f1", ["a.svg"]), folder("f2"));

    const folders = await StoreManager.getFolders();
    expect(folders.map((f) => f.id)).toEqual(["f1", "f2"]);
    expect(folders[0].qrCodes).toEqual(["a.svg"]);
  });

  it("drops an id whose folder object is gone, and heals the list", async () => {
    // This is a read that writes. Worth knowing before asserting call counts.
    const { default: StoreManager } = await freshStore();
    seedFolders(folder("f1"), folder("ghost"));
    backing.delete("folders::ghost");

    const folders = await StoreManager.getFolders();

    expect(folders.map((f) => f.id)).toEqual(["f1"]);
    expect(JSON.parse(backing.get("folders::list") as string)).toEqual(["f1"]);
  });

  it("does not rewrite the list when nothing was stale", async () => {
    const { default: StoreManager } = await freshStore();
    seedFolders(folder("f1"));
    backing.set("folders::list", JSON.stringify(["f1"]));

    await StoreManager.getFolders();
    expect(JSON.parse(backing.get("folders::list") as string)).toEqual(["f1"]);
  });

  it("returns a duplicated id twice, because the heal is count-based", async () => {
    // Known limitation, pinned rather than endorsed: the self-heal only fires when
    // the resolved count differs from the list length, so a duplicate resolves to
    // two entries, the counts match, and it survives. It reaches the UI as two
    // identical folders.
    const { default: StoreManager } = await freshStore();
    seedFolders(folder("f1"));
    backing.set("folders::list", JSON.stringify(["f1", "f1"]));

    const folders = await StoreManager.getFolders();
    expect(folders).toHaveLength(2);
    expect(folders[0].id).toBe(folders[1].id);
  });

  it("preserves list order", async () => {
    const { default: StoreManager } = await freshStore();
    seedFolders(folder("b"), folder("a"), folder("c"));

    expect((await StoreManager.getFolders()).map((f) => f.id)).toEqual([
      "b",
      "a",
      "c",
    ]);
  });
});

describe("saveFolder", () => {
  it("writes the folder and registers a new id", async () => {
    const { default: StoreManager } = await freshStore();

    await StoreManager.saveFolder(folder("f1", ["a.svg"]));

    expect(JSON.parse(backing.get("folders::list") as string)).toEqual(["f1"]);
    expect(await StoreManager.getFolders()).toHaveLength(1);
  });

  it("does not duplicate the id when updating an existing folder", async () => {
    const { default: StoreManager } = await freshStore();

    await StoreManager.saveFolder(folder("f1"));
    await StoreManager.saveFolder(folder("f1", ["a.svg"]));

    expect(JSON.parse(backing.get("folders::list") as string)).toEqual(["f1"]);
    const folders = await StoreManager.getFolders();
    expect(folders).toHaveLength(1);
    expect(folders[0].qrCodes).toEqual(["a.svg"]);
  });

  it("appends new folders in creation order", async () => {
    const { default: StoreManager } = await freshStore();

    await StoreManager.saveFolder(folder("first"));
    await StoreManager.saveFolder(folder("second"));

    expect(JSON.parse(backing.get("folders::list") as string)).toEqual([
      "first",
      "second",
    ]);
  });

  it("round-trips the archived flag as a real JSON boolean", async () => {
    // Folders store `archived` inside the blob, unlike codes which use a separate
    // "true"-or-absent key. Two conventions in one store; both are load-bearing.
    const { default: StoreManager } = await freshStore();

    await StoreManager.saveFolder(folder("f1", [], true));

    const [saved] = await StoreManager.getFolders();
    expect(saved.archived).toBe(true);
  });
});

describe("deleteFolder", () => {
  it("removes the folder and its id", async () => {
    const { default: StoreManager } = await freshStore();
    await StoreManager.saveFolder(folder("f1"));

    await StoreManager.deleteFolder("f1");

    expect(backing.has("folders::f1")).toBe(false);
    expect(await StoreManager.getFolders()).toEqual([]);
  });

  it("leaves other folders untouched", async () => {
    const { default: StoreManager } = await freshStore();
    await StoreManager.saveFolder(folder("f1"));
    await StoreManager.saveFolder(folder("f2"));

    await StoreManager.deleteFolder("f1");

    expect((await StoreManager.getFolders()).map((f) => f.id)).toEqual(["f2"]);
  });

  it("is a no-op for an id that does not exist", async () => {
    const { default: StoreManager } = await freshStore();
    await StoreManager.saveFolder(folder("f1"));

    await StoreManager.deleteFolder("ghost");

    expect((await StoreManager.getFolders()).map((f) => f.id)).toEqual(["f1"]);
  });
});

describe("folder membership round-trip", () => {
  it("survives a save, reload and delete cycle", async () => {
    const { default: StoreManager } = await freshStore();

    await StoreManager.saveFolder(folder("f1", ["a.svg", "b.svg"]));
    const [loaded] = await StoreManager.getFolders();
    expect(loaded.qrCodes).toEqual(["a.svg", "b.svg"]);

    await StoreManager.saveFolder({ ...loaded, qrCodes: ["a.svg"] });
    expect((await StoreManager.getFolders())[0].qrCodes).toEqual(["a.svg"]);

    await StoreManager.deleteFolder("f1");
    expect(await StoreManager.getFolders()).toEqual([]);
  });
});
