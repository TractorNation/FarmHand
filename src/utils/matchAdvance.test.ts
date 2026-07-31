import { describe, expect, it } from "vitest";
import { buildPersistedEntries, nextMatchNumber } from "./matchAdvance";

/**
 * Match-number advancement after "Complete & Next".
 *
 * This shipped broken for every scout **not** using TBA. `getAllMatchNumbers()`
 * returns `[]` with no event loaded, and on an empty array `indexOf` gives -1 while
 * `length - 1` is also -1 — so the "last match in the schedule, hold the value"
 * branch caught every non-TBA case and the documented `+1` fallback was unreachable.
 * The form kept showing match 1 after match 1 was submitted, and each following match
 * was saved under the wrong number with nothing to indicate it.
 */

const field = (over: Partial<Component> = {}): Component =>
  ({ id: 0, name: "Match Number", type: "number", ...over }) as Component;

describe("nextMatchNumber with no TBA schedule", () => {
  it("increments a plain match number", () => {
    // The regression: this returned 1.
    expect(nextMatchNumber("1", [], undefined)).toBe(2);
    expect(nextMatchNumber("7", [], undefined)).toBe(8);
  });

  it("increments a numeric value stored as a number", () => {
    expect(nextMatchNumber(12, [], undefined)).toBe(13);
  });

  it("clamps at the field's max rather than running past it", () => {
    expect(nextMatchNumber("99", [], 99)).toBe(99);
    expect(nextMatchNumber("98", [], 99)).toBe(99);
  });

  it("holds a value with nothing numeric to increment", () => {
    expect(nextMatchNumber("Practice", [], undefined)).toBe("Practice");
    expect(nextMatchNumber("", [], undefined)).toBe("");
  });

  it("increments the trailing number of a dashed label", () => {
    expect(nextMatchNumber("Qual-12", [], undefined)).toBe(13);
  });
});

describe("nextMatchNumber with a TBA schedule", () => {
  const schedule = ["Qual-1", "Qual-2", "Qual-3", "Semis-1", "Final-1"];

  it("advances to the next scheduled match", () => {
    expect(nextMatchNumber("Qual-1", schedule)).toBe("Qual-2");
  });

  it("crosses a competition level in schedule order", () => {
    // The reason the schedule wins over arithmetic: Qual-3 is followed by Semis-1,
    // which no amount of incrementing would produce.
    expect(nextMatchNumber("Qual-3", schedule)).toBe("Semis-1");
  });

  it("holds at the last scheduled match rather than running off the end", () => {
    expect(nextMatchNumber("Final-1", schedule)).toBe("Final-1");
  });

  it("falls back to increment for a value not on the schedule", () => {
    // TBA loaded, but the scout typed a match that is not in this event.
    expect(nextMatchNumber("42", schedule)).toBe(43);
  });

  it("holds a non-numeric value that is not on the schedule", () => {
    expect(nextMatchNumber("Practice", schedule)).toBe("Practice");
  });

  it("advances correctly through a full schedule", () => {
    let current: any = "Qual-1";
    const seen = [current];
    for (let i = 0; i < 4; i++) {
      current = nextMatchNumber(current, schedule);
      seen.push(current);
    }
    expect(seen).toEqual([
      "Qual-1",
      "Qual-2",
      "Qual-3",
      "Semis-1",
      "Final-1",
    ]);
  });
});

describe("buildPersistedEntries", () => {
  const fields: Component[] = [
    field({ id: 0, name: "Match Number", props: { max: 99 } }),
    field({ id: 1, name: "Team Number", type: "number" }),
    field({ id: 2, name: "Scouter", type: "text", persist: true }),
    field({ id: 3, name: "Alliance", type: "dropdown", persist: true }),
    field({ id: 4, name: "Points", type: "counter" }),
  ];

  it("keeps persist fields and drops the rest", () => {
    const entries = buildPersistedEntries({
      fields,
      matchData: new Map<number, any>([
        [0, "5"],
        [1, "254"],
        [2, "Jake"],
        [3, "Red"],
        [4, 30],
      ]),
      allMatchNumbers: [],
      incrementMatchNumber: false,
    });

    // Team Number and Points are not persist, and Match Number is not incrementing.
    expect(entries).toEqual([
      { key: 2, value: "Jake" },
      { key: 3, value: "Red" },
    ]);
  });

  it("advances Match Number when asked, alongside the persist fields", () => {
    const entries = buildPersistedEntries({
      fields,
      matchData: new Map<number, any>([
        [0, "5"],
        [2, "Jake"],
      ]),
      allMatchNumbers: [],
      incrementMatchNumber: true,
    });

    expect(entries).toEqual([
      { key: 0, value: 6 },
      { key: 2, value: "Jake" },
    ]);
  });

  it("respects the Match Number field's max when advancing", () => {
    const entries = buildPersistedEntries({
      fields,
      matchData: new Map<number, any>([[0, "99"]]),
      allMatchNumbers: [],
      incrementMatchNumber: true,
    });

    expect(entries).toEqual([{ key: 0, value: 99 }]);
  });

  it("skips a null or undefined value rather than restoring it", () => {
    // Restoring an explicit null would make a cleared field read as answered-with-
    // nothing instead of untouched.
    const entries = buildPersistedEntries({
      fields,
      matchData: new Map<number, any>([
        [0, null],
        [2, undefined],
        [3, "Blue"],
      ]),
      allMatchNumbers: [],
      incrementMatchNumber: true,
    });

    expect(entries).toEqual([{ key: 3, value: "Blue" }]);
  });

  it("returns nothing when there is no data to carry over", () => {
    expect(
      buildPersistedEntries({
        fields,
        matchData: new Map(),
        allMatchNumbers: [],
        incrementMatchNumber: true,
      })
    ).toEqual([]);
  });

  it("uses the schedule for Match Number when TBA is loaded", () => {
    const entries = buildPersistedEntries({
      fields,
      matchData: new Map<number, any>([[0, "Qual-1"]]),
      allMatchNumbers: ["Qual-1", "Qual-2"],
      incrementMatchNumber: true,
    });

    expect(entries).toEqual([{ key: 0, value: "Qual-2" }]);
  });
});
