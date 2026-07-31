import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

/**
 * Folder CRUD against the store.
 *
 * Named `.test.tsx` deliberately: `renderHook` needs a DOM, and `vite.config.ts`
 * routes `*.test.ts` to the node project. A `.test.ts` here would fail on a missing
 * `document` rather than being skipped.
 *
 * `StoreManager` is mocked so the exact write payloads and call counts are
 * observable — several of these behaviours are "does *not* write" guarantees, which
 * a real store could not distinguish from a write that happened to change nothing.
 */

const store = vi.hoisted(() => ({
  getFolders: vi.fn(),
  saveFolder: vi.fn(),
  deleteFolder: vi.fn(),
}));

const qr = vi.hoisted(() => ({
  archiveQrCode: vi.fn(),
  unarchiveQrCode: vi.fn(),
  deleteQrCode: vi.fn(),
}));

vi.mock("../utils/StoreManager", () => ({ default: store }));
vi.mock("../utils/QrUtils", () => qr);

const { useFolderManager } = await import("./useFolderManager");

const folder = (
  id: string,
  qrCodes: string[],
  archived = false
): QrFolder => ({
  id,
  name: `Folder ${id}`,
  createdAt: 0,
  qrCodes,
  archived,
});

/**
 * Renders the hook and waits for the mount-time load to reach state.
 *
 * Waiting on `getFolders` having been *called* is not enough — the handlers close
 * over `folders`, so acting before `setFolders` lands runs them against an empty
 * list and they silently early-return. `allFolders` is the unfiltered list, so this
 * works regardless of `showArchived`.
 */
async function mount(folders: QrFolder[], showArchived = false) {
  store.getFolders.mockResolvedValue(folders);
  const view = renderHook(() => useFolderManager({ showArchived }));
  await waitFor(() =>
    expect(view.result.current.allFolders).toHaveLength(folders.length)
  );
  return view;
}

beforeEach(() => {
  vi.clearAllMocks();
  store.saveFolder.mockResolvedValue(undefined);
  store.deleteFolder.mockResolvedValue(undefined);
  qr.archiveQrCode.mockResolvedValue(undefined);
  qr.unarchiveQrCode.mockResolvedValue(undefined);
  qr.deleteQrCode.mockResolvedValue(undefined);
});

describe("which folders are exposed", () => {
  it("shows only this page's folders in `folders`", async () => {
    const { result } = await mount([
      folder("live", [], false),
      folder("archived", [], true),
    ]);

    await waitFor(() => expect(result.current.folders).toHaveLength(1));
    expect(result.current.folders[0].id).toBe("live");
  });

  it("shows the other page's folders in `allFolders`", async () => {
    // Anything clearing a code's previous folders must see both pages, or a move
    // leaves the code in two folders.
    const { result } = await mount([
      folder("live", [], false),
      folder("archived", [], true),
    ]);

    await waitFor(() => expect(result.current.allFolders).toHaveLength(2));
  });

  it("treats a folder with no archived field as unarchived", async () => {
    const legacy: QrFolder = { id: "legacy", name: "Legacy", createdAt: 0, qrCodes: [] };
    const { result } = await mount([legacy]);

    await waitFor(() => expect(result.current.folders).toHaveLength(1));
  });

  it("resolves currentFolderData across pages, not just this one", async () => {
    // You can be inside an archived folder while viewing the QR page.
    const { result } = await mount([folder("archived", ["a.svg"], true)]);

    act(() => result.current.setCurrentFolder("archived"));

    await waitFor(() =>
      expect(result.current.currentFolderData?.id).toBe("archived")
    );
    expect(result.current.folders).toHaveLength(0);
  });
});

describe("createFolder", () => {
  it("creates in the current page's context", async () => {
    const { result } = await mount([], true);

    await act(async () => {
      await result.current.createFolder("New");
    });

    expect(store.saveFolder).toHaveBeenCalledWith(
      expect.objectContaining({ name: "New", archived: true, qrCodes: [] })
    );
  });

  it("reloads so the new folder appears", async () => {
    const { result } = await mount([]);

    await act(async () => {
      await result.current.createFolder("New");
    });

    expect(store.getFolders).toHaveBeenCalledTimes(2);
  });
});

describe("addQrCodesToFolder", () => {
  it("writes the folder with the new names appended", async () => {
    const { result } = await mount([folder("f1", ["a.svg"])]);

    await act(async () => {
      await result.current.addQrCodesToFolder(["b.svg"], "f1");
    });

    expect(store.saveFolder).toHaveBeenCalledWith(
      expect.objectContaining({ id: "f1", qrCodes: ["a.svg", "b.svg"] })
    );
  });

  it("does not write when every name is already present", async () => {
    // Idempotence matters: re-filing a selection into its own folder should not
    // churn the store or bump the folder list.
    const { result } = await mount([folder("f1", ["a.svg"])]);

    await act(async () => {
      await result.current.addQrCodesToFolder(["a.svg"], "f1");
    });

    expect(store.saveFolder).not.toHaveBeenCalled();
  });

  it("adds only the names that are missing", async () => {
    const { result } = await mount([folder("f1", ["a.svg"])]);

    await act(async () => {
      await result.current.addQrCodesToFolder(["a.svg", "b.svg"], "f1");
    });

    expect(store.saveFolder).toHaveBeenCalledWith(
      expect.objectContaining({ qrCodes: ["a.svg", "b.svg"] })
    );
  });

  it("does nothing for an unknown folder id", async () => {
    const { result } = await mount([folder("f1", [])]);

    await act(async () => {
      await result.current.addQrCodesToFolder(["a.svg"], "nope");
    });

    expect(store.saveFolder).not.toHaveBeenCalled();
  });
});

describe("removeQrCodesFromFolder", () => {
  it("writes the folder without the removed names", async () => {
    const { result } = await mount([folder("f1", ["a.svg", "b.svg"])]);

    await act(async () => {
      await result.current.removeQrCodesFromFolder(["a.svg"], "f1");
    });

    expect(store.saveFolder).toHaveBeenCalledWith(
      expect.objectContaining({ qrCodes: ["b.svg"] })
    );
  });

  it("writes even when the name was not in the folder", async () => {
    // Unlike the add path there is no early return here. Documented rather than
    // endorsed: a redundant write is harmless, an inconsistent one would not be.
    const { result } = await mount([folder("f1", ["a.svg"])]);

    await act(async () => {
      await result.current.removeQrCodesFromFolder(["absent.svg"], "f1");
    });

    expect(store.saveFolder).toHaveBeenCalledWith(
      expect.objectContaining({ qrCodes: ["a.svg"] })
    );
  });
});

describe("archiveFolder", () => {
  it("flips the folder and cascades to every code inside it", async () => {
    const { result } = await mount([folder("f1", ["a.svg", "b.svg"])]);

    await act(async () => {
      await result.current.archiveFolder("f1");
    });

    expect(store.saveFolder).toHaveBeenCalledWith(
      expect.objectContaining({ id: "f1", archived: true })
    );
    expect(qr.archiveQrCode).toHaveBeenCalledWith("a.svg");
    expect(qr.archiveQrCode).toHaveBeenCalledWith("b.svg");
  });

  it("unarchives the folder and its codes together", async () => {
    const { result } = await mount([folder("f1", ["a.svg"], true)], true);

    await act(async () => {
      await result.current.unarchiveFolder("f1");
    });

    expect(store.saveFolder).toHaveBeenCalledWith(
      expect.objectContaining({ archived: false })
    );
    expect(qr.unarchiveQrCode).toHaveBeenCalledWith("a.svg");
  });

  it("does nothing for an unknown folder", async () => {
    const { result } = await mount([folder("f1", ["a.svg"])]);

    await act(async () => {
      await result.current.archiveFolder("nope");
    });

    expect(store.saveFolder).not.toHaveBeenCalled();
    expect(qr.archiveQrCode).not.toHaveBeenCalled();
  });
});

describe("deleteFolder", () => {
  it("removes the folder without touching the codes when asked not to", async () => {
    const { result } = await mount([folder("f1", ["a.svg"])]);

    await act(async () => {
      await result.current.deleteFolder("f1", false);
    });

    expect(qr.deleteQrCode).not.toHaveBeenCalled();
    expect(store.deleteFolder).toHaveBeenCalledWith("f1");
  });

  it("deletes the contained codes when asked to", async () => {
    const { result } = await mount([folder("f1", ["a.svg", "b.svg"])]);

    await act(async () => {
      await result.current.deleteFolder("f1", true);
    });

    expect(qr.deleteQrCode).toHaveBeenCalledWith("a.svg");
    expect(qr.deleteQrCode).toHaveBeenCalledWith("b.svg");
  });

  it("still removes the folder when one code deletion fails", async () => {
    // The reason this uses Promise.allSettled: a single missing file must not strand
    // the folder, which would leave it listing codes that no longer exist.
    qr.deleteQrCode.mockRejectedValueOnce(new Error("file missing"));
    const { result } = await mount([folder("f1", ["gone.svg", "b.svg"])]);

    await act(async () => {
      await result.current.deleteFolder("f1", true);
    });

    expect(store.deleteFolder).toHaveBeenCalledWith("f1");
  });

  it("deletes from the store even for an id not in local state", async () => {
    // Deliberately unguarded: the store delete is idempotent, and refusing here
    // would make a stale UI permanently unable to clear a folder.
    const { result } = await mount([]);

    await act(async () => {
      await result.current.deleteFolder("ghost", false);
    });

    expect(store.deleteFolder).toHaveBeenCalledWith("ghost");
  });
});

describe("renameFolder", () => {
  it("writes the new name", async () => {
    const { result } = await mount([folder("f1", [])]);

    await act(async () => {
      await result.current.renameFolder("f1", "Quals");
    });

    expect(store.saveFolder).toHaveBeenCalledWith(
      expect.objectContaining({ id: "f1", name: "Quals" })
    );
  });

  it("accepts an empty name", async () => {
    // No validation exists at this layer. Pinned so that adding it is a deliberate
    // change rather than an accident.
    const { result } = await mount([folder("f1", [])]);

    await act(async () => {
      await result.current.renameFolder("f1", "");
    });

    expect(store.saveFolder).toHaveBeenCalledWith(
      expect.objectContaining({ name: "" })
    );
  });
});

describe("selection", () => {
  it("tracks selection by id and exposes the matching folders", async () => {
    const f1 = folder("f1", []);
    const { result } = await mount([f1, folder("f2", [])]);

    act(() => result.current.toggleFolderSelection(f1));

    await waitFor(() => expect(result.current.selectedFolders).toHaveLength(1));
    expect(result.current.isFolderSelected(f1)).toBe(true);
  });

  it("toggles back off", async () => {
    const f1 = folder("f1", []);
    const { result } = await mount([f1]);

    act(() => result.current.toggleFolderSelection(f1));
    act(() => result.current.toggleFolderSelection(f1));

    await waitFor(() => expect(result.current.selectedFolders).toHaveLength(0));
  });

  it("selects by id, so a re-read folder object stays selected", async () => {
    // Folder objects are replaced on every load; selecting by reference would drop
    // the selection each time the store is re-read.
    const { result } = await mount([folder("f1", [])]);

    act(() => result.current.toggleFolderSelection(folder("f1", [])));

    await waitFor(() => expect(result.current.selectedFolders).toHaveLength(1));
  });

  it("clears every selection at once", async () => {
    const f1 = folder("f1", []);
    const f2 = folder("f2", []);
    const { result } = await mount([f1, f2]);

    act(() => result.current.toggleFolderSelection(f1));
    act(() => result.current.toggleFolderSelection(f2));
    act(() => result.current.resetFolderSelection());

    await waitFor(() => expect(result.current.selectedFolders).toHaveLength(0));
  });

  it("drops a deleted folder from the selection", async () => {
    const f1 = folder("f1", []);
    const { result } = await mount([f1]);

    act(() => result.current.toggleFolderSelection(f1));
    await waitFor(() => expect(result.current.selectedFolders).toHaveLength(1));

    store.getFolders.mockResolvedValue([]);
    await act(async () => {
      await result.current.deleteFolder("f1", false);
    });

    expect(result.current.selectedFolders).toHaveLength(0);
  });
});
