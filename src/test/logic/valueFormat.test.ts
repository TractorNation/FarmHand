import { describe, expect, it } from "vitest";
import { formatTime, getMatchSortKey, parseTime } from "../../utils/valueFormat";

/**
 * `parseTime` and `formatTime` are documented as exact inverses, and both the match
 * codec and TimerInput depend on that: the codec stores deciseconds, the input renders
 * a string, and a decoded timer has to show the scout exactly what they recorded.
 *
 * `getMatchSortKey` orders every match list in the app — the QR page, the archive and
 * the cartesian chart axis. Getting it wrong reorders data rather than failing loudly.
 */

describe("parseTime", () => {
  it("reads plain seconds as deciseconds", () => {
    expect(parseTime("5.0")).toBe(50);
    expect(parseTime("0.0")).toBe(0);
    expect(parseTime("12.3")).toBe(123);
  });

  it("reads the minutes form", () => {
    expect(parseTime("2:30.0")).toBe(1500);
    expect(parseTime("1:00.0")).toBe(600);
  });

  it("treats missing or non-string input as zero rather than NaN", () => {
    // A NaN here would propagate into the bit packer as a corrupt field width.
    expect(parseTime(undefined)).toBe(0);
    expect(parseTime("")).toBe(0);
    expect(parseTime("not a time")).toBe(0);
    expect(parseTime(":" as string)).toBe(0);
  });
});

describe("formatTime", () => {
  it("renders under a minute as plain seconds", () => {
    expect(formatTime(0)).toBe("0.0");
    expect(formatTime(123)).toBe("12.3");
    expect(formatTime(599)).toBe("59.9");
  });

  it("switches to the minutes form at exactly one minute", () => {
    // The boundary the padStart(4, "0") exists for: this must not render "0:60.0".
    expect(formatTime(600)).toBe("1:00.0");
    expect(formatTime(601)).toBe("1:00.1");
    expect(formatTime(1500)).toBe("2:30.0");
  });

  it("keeps the seconds field zero-padded so the width is stable", () => {
    expect(formatTime(650)).toBe("1:05.0");
  });

  it("treats a missing value as zero", () => {
    expect(formatTime(undefined as unknown as number)).toBe("0.0");
  });
});

describe("timer round-trip", () => {
  it("is an exact inverse for every decisecond up to an hour", () => {
    // Deciseconds are always integers on the wire, so this is the whole input domain
    // the codec can produce. The failure this guards is a seconds value that formats
    // as "60.0" and re-parses one minute high.
    for (let tenths = 0; tenths <= 36000; tenths++) {
      expect(parseTime(formatTime(tenths))).toBe(tenths);
    }
  });
});

describe("getMatchSortKey", () => {
  it("orders competition levels Qual < Semis < Final", () => {
    expect(getMatchSortKey("Qual-1")[0]).toBe(0);
    expect(getMatchSortKey("Semis-1")[0]).toBe(1);
    expect(getMatchSortKey("Final-1")[0]).toBe(2);
  });

  it("sorts numerically within a level, not lexically", () => {
    // The regression this guards: string sorting puts "Qual-10" before "Qual-9".
    expect(getMatchSortKey("Qual-9")[1]).toBe(9);
    expect(getMatchSortKey("Qual-10")[1]).toBe(10);

    const sorted = ["Qual-10", "Qual-2", "Qual-1"].sort((a, b) => {
      const [al, an] = getMatchSortKey(a);
      const [bl, bn] = getMatchSortKey(b);
      return al - bl || an - bn;
    });
    expect(sorted).toEqual(["Qual-1", "Qual-2", "Qual-10"]);
  });

  it("treats a bare integer as a qualification match", () => {
    // Pit scouting and non-TBA schemas store plain numbers.
    expect(getMatchSortKey("7")).toEqual([0, 7]);
  });

  it("sorts a full event in competition order", () => {
    const order = ["Final-1", "Qual-2", "Semis-3", "Qual-10", "Semis-1"].sort(
      (a, b) => {
        const [al, an] = getMatchSortKey(a);
        const [bl, bn] = getMatchSortKey(b);
        return al - bl || an - bn;
      }
    );
    expect(order).toEqual([
      "Qual-2",
      "Qual-10",
      "Semis-1",
      "Semis-3",
      "Final-1",
    ]);
  });

  it("degrades to [0, 0] for an unparseable label rather than NaN", () => {
    // NaN in a comparator makes the sort order implementation-defined.
    expect(getMatchSortKey("garbage")).toEqual([0, 0]);
    expect(getMatchSortKey("Qual-abc")).toEqual([0, 0]);
    expect(getMatchSortKey("")).toEqual([0, 0]);
  });

  it("treats an unknown prefix as qual level but keeps its number", () => {
    expect(getMatchSortKey("Practice-4")).toEqual([0, 4]);
  });
});
