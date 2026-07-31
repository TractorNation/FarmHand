import { describe, expect, it } from "vitest";
import {
  findFolderContainingAll,
  folderCodes,
  planMove,
  rootCodes,
} from "./folderPlan";

/**
 * Folder membership arithmetic.
 *
 * Every failure mode here is silent: a code shown twice, a code shown nowhere, or a
 * code that ends up in two folders at once. Nothing throws, so only assertions catch
 * it. Folder membership is stored as a list of *names* on the folder with no
 * back-pointer from the code, so these are the only rules keeping it consistent.
 */

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

const code = (name: string, archived = false): QrCode => ({
  name,
  data: `FRMHND:M2:B0F68211:1:PAYLOAD`,
  image: "<svg/>",
  archived,
});

const a = code("a.svg");
const b = code("b.svg");
const c = code("c.svg");
const visible = [a, b, c];

describe("rootCodes", () => {
  it("returns only codes that belong to no folder", () => {
    // A code inside a folder is deliberately hidden from the root so it appears once.
    expect(rootCodes(visible, [folder("f1", ["a.svg"])])).toEqual([b, c]);
  });

  it("returns everything when there are no folders", () => {
    expect(rootCodes(visible, [])).toEqual(visible);
  });

  it("hides a code held by any folder, not just the first", () => {
    expect(
      rootCodes(visible, [folder("f1", ["a.svg"]), folder("f2", ["c.svg"])])
    ).toEqual([b]);
  });

  it("ignores folder entries naming codes that no longer exist", () => {
    // Stale names are expected: membership is by name with no referential integrity.
    expect(rootCodes(visible, [folder("f1", ["deleted.svg"])])).toEqual(visible);
  });

  it("returns nothing when every code is filed", () => {
    expect(
      rootCodes(visible, [folder("f1", ["a.svg", "b.svg", "c.svg"])])
    ).toEqual([]);
  });
});

describe("folderCodes", () => {
  it("returns the visible codes named by the folder", () => {
    expect(folderCodes(visible, folder("f1", ["a.svg", "c.svg"]))).toEqual([a, c]);
  });

  it("returns nothing for a folder that does not resolve", () => {
    // Showing everything would be the dangerous failure: a bulk delete inside a
    // missing folder would then target the whole page.
    expect(folderCodes(visible, null)).toEqual([]);
  });

  it("skips names with no matching code", () => {
    expect(folderCodes(visible, folder("f1", ["a.svg", "gone.svg"]))).toEqual([a]);
  });

  it("preserves the order of the visible list, not the folder's", () => {
    expect(folderCodes(visible, folder("f1", ["c.svg", "a.svg"]))).toEqual([a, c]);
  });
});

describe("findFolderContainingAll", () => {
  it("returns null when nothing is selected", () => {
    expect(findFolderContainingAll([folder("f1", ["a.svg"])], [])).toBeNull();
  });

  it("returns the one folder holding the whole selection", () => {
    const f1 = folder("f1", ["a.svg", "b.svg"]);
    expect(findFolderContainingAll([f1, folder("f2", ["c.svg"])], ["a.svg", "b.svg"]))
      .toBe(f1);
  });

  it("matches a folder that holds more than the selection", () => {
    // Superset, not equality: removing 1 of a folder's 3 codes is unambiguous.
    const f1 = folder("f1", ["a.svg", "b.svg", "c.svg"]);
    expect(findFolderContainingAll([f1], ["a.svg"])).toBe(f1);
  });

  it("returns null when the selection spans two folders", () => {
    expect(
      findFolderContainingAll(
        [folder("f1", ["a.svg"]), folder("f2", ["b.svg"])],
        ["a.svg", "b.svg"]
      )
    ).toBeNull();
  });

  it("returns null when two folders both hold the whole selection", () => {
    // Double membership should not happen, but if it does the target is ambiguous
    // and removing from a guessed folder would be worse than offering nothing.
    expect(
      findFolderContainingAll(
        [folder("f1", ["a.svg"]), folder("f2", ["a.svg", "b.svg"])],
        ["a.svg"]
      )
    ).toBeNull();
  });

  it("returns null when no folder holds the selection", () => {
    expect(findFolderContainingAll([folder("f1", ["c.svg"])], ["a.svg"])).toBeNull();
  });

  it("returns null when there are no folders at all", () => {
    expect(findFolderContainingAll([], ["a.svg"])).toBeNull();
  });
});

describe("planMove", () => {
  it("adds the selection to the destination", () => {
    expect(planMove([], "target", ["a.svg", "b.svg"]).additions).toEqual([
      "a.svg",
      "b.svg",
    ]);
  });

  it("dedupes names collected from overlapping folders", () => {
    // Moving two selected folders that share a code must add it once.
    expect(planMove([], "target", ["a.svg", "a.svg", "b.svg"]).additions).toEqual([
      "a.svg",
      "b.svg",
    ]);
  });

  it("clears the code from its previous folder", () => {
    const plan = planMove(
      [folder("source", ["a.svg", "z.svg"]), folder("target", [])],
      "target",
      ["a.svg"]
    );

    expect(plan.removals).toEqual([{ folderId: "source", names: ["a.svg"] }]);
  });

  it("never removes from the destination folder", () => {
    // Re-filing a code into the folder it is already in must be a no-op, not a
    // remove-then-add that briefly loses it.
    const plan = planMove([folder("target", ["a.svg"])], "target", ["a.svg"]);

    expect(plan.removals).toEqual([]);
    expect(plan.additions).toEqual(["a.svg"]);
  });

  it("clears a code that is in two folders from both", () => {
    const plan = planMove(
      [folder("f1", ["a.svg"]), folder("f2", ["a.svg"]), folder("target", [])],
      "target",
      ["a.svg"]
    );

    expect(plan.removals).toEqual([
      { folderId: "f1", names: ["a.svg"] },
      { folderId: "f2", names: ["a.svg"] },
    ]);
  });

  it("skips folders that hold none of the moved codes", () => {
    const plan = planMove(
      [folder("unrelated", ["z.svg"]), folder("source", ["a.svg"])],
      "target",
      ["a.svg"]
    );

    expect(plan.removals).toEqual([{ folderId: "source", names: ["a.svg"] }]);
  });

  it("clears a source folder on the other page", () => {
    // The bug this guards: the removal scan used to run over the current page's
    // folders only, so moving an unarchived code out of an archived folder left it
    // in both. Reachable by unarchiving one code inside an archived folder.
    const archivedFolder = folder("archived", ["a.svg"], true);
    const plan = planMove(
      [archivedFolder, folder("target", [], false)],
      "target",
      ["a.svg"]
    );

    expect(plan.removals).toEqual([{ folderId: "archived", names: ["a.svg"] }]);
  });

  it("produces an empty plan for an empty selection", () => {
    const plan = planMove([folder("f1", ["a.svg"])], "target", []);
    expect(plan).toEqual({ removals: [], additions: [] });
  });

  it("guarantees a moved code ends up in exactly one folder", () => {
    // The invariant the whole function exists for, asserted directly by applying
    // the plan to the folder set.
    const folders = [
      folder("f1", ["a.svg", "b.svg"]),
      folder("f2", ["a.svg"], true),
      folder("target", ["z.svg"]),
    ];
    const plan = planMove(folders, "target", ["a.svg"]);

    const applied = folders.map((f) => {
      const removal = plan.removals.find((r) => r.folderId === f.id);
      const remaining = removal
        ? f.qrCodes.filter((n) => !removal.names.includes(n))
        : [...f.qrCodes];
      return f.id === "target"
        ? { ...f, qrCodes: [...remaining, ...plan.additions] }
        : { ...f, qrCodes: remaining };
    });

    const holders = applied.filter((f) => f.qrCodes.includes("a.svg"));
    expect(holders.map((f) => f.id)).toEqual(["target"]);
  });
});
