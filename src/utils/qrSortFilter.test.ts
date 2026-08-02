import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { filterAndSortQrCodes } from "./qrSortFilter";

/**
 * The date filters shipped broken.
 *
 * `generateQrFileName` writes `Date.now()` in **milliseconds**, but this code
 * multiplied by 1000 again, dating every saved code to roughly the year 58500. The
 * two halves then failed in opposite directions and neither raised anything:
 *
 * | Filter | Was | Now |
 * |---|---|---|
 * | `day` | matched nothing, ever | matches codes saved today |
 * | `date range` | matched nothing, ever | matches codes inside the range |
 * | `week` / `month` | no-op, matched everything | excludes older codes |
 *
 * Time is frozen so these assert a fixed relationship rather than rotting.
 */

// Local time throughout: the range filter widens its bounds with `setHours`, which is
// local, so UTC-built fixtures would make these pass or fail by timezone.
const NOW = new Date(2026, 6, 30, 12, 0, 0);

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterAll(() => {
  vi.useRealTimers();
});

const DAY = 24 * 60 * 60 * 1000;

/** Builds a code whose filename encodes team, match and a save time. */
const code = (
  team: string,
  match: string,
  savedAt: Date,
  extra: Partial<QrCode> = {}
): QrCode => ({
  name: `${team}-${match}-${savedAt.getTime()}.svg`,
  data: `FRMHND:M:B0F68211:1:PAYLOAD`,
  image: "<svg/>",
  ...extra,
});

const today = code("254", "Qual-1", NOW);
const threeDaysAgo = code("1678", "Qual-2", new Date(NOW.getTime() - 3 * DAY));
const tenDaysAgo = code("118", "Qual-3", new Date(NOW.getTime() - 10 * DAY));
const fortyDaysAgo = code("971", "Qual-4", new Date(NOW.getTime() - 40 * DAY));

const ALL = [today, threeDaysAgo, tenDaysAgo, fortyDaysAgo];

const run = (over: Partial<Parameters<typeof filterAndSortQrCodes>[0]>) =>
  filterAndSortQrCodes({
    qrCodes: ALL,
    filters: [],
    sortMode: "none",
    sortDirection: "ascending",
    ...over,
  });

const names = (codes: QrCode[]) => codes.map((c) => c.name);

describe("day filter", () => {
  it("keeps a code saved today", () => {
    // The headline regression: this returned an empty list for every code.
    expect(run({ filters: ["day"] })).toEqual([today]);
  });

  it("excludes a code saved yesterday", () => {
    const yesterday = code("254", "Qual-9", new Date(NOW.getTime() - DAY));
    expect(run({ qrCodes: [yesterday], filters: ["day"] })).toEqual([]);
  });

  it("keeps a code saved earlier today", () => {
    const earlier = code("254", "Qual-8", new Date(2026, 6, 30, 1, 0, 0));
    expect(run({ qrCodes: [earlier], filters: ["day"] })).toEqual([earlier]);
  });
});

describe("week filter", () => {
  it("keeps codes from the last seven days and drops older ones", () => {
    // Was a no-op that returned all four.
    expect(names(run({ filters: ["week"] }))).toEqual([
      today.name,
      threeDaysAgo.name,
    ]);
  });
});

describe("month filter", () => {
  it("keeps codes from the last thirty days and drops older ones", () => {
    expect(names(run({ filters: ["month"] }))).toEqual([
      today.name,
      threeDaysAgo.name,
      tenDaysAgo.name,
    ]);
  });
});

describe("date range filter", () => {
  it("includes a code saved on the boundary day at any hour", () => {
    // The range deliberately widens to 00:00:00.000 and 23:59:59.999 local, so a
    // code saved late on the last day is still inside it.
    const lateInDay = code("254", "Qual-5", new Date(2026, 6, 28, 23, 30, 0));
    const start = new Date(2026, 6, 27, 0, 0, 0);
    const end = new Date(2026, 6, 28, 0, 0, 0);

    expect(
      run({
        qrCodes: [lateInDay],
        filters: ["date range"],
        dateRangeStart: start,
        dateRangeEnd: end,
      })
    ).toEqual([lateInDay]);
  });

  it("excludes a code outside the range", () => {
    expect(
      run({
        filters: ["date range"],
        dateRangeStart: new Date(2026, 6, 1, 0, 0, 0),
        dateRangeEnd: new Date(2026, 6, 2, 0, 0, 0),
      })
    ).toEqual([]);
  });

  it("is inert unless both ends are supplied", () => {
    expect(
      run({ filters: ["date range"], dateRangeStart: new Date(), dateRangeEnd: null })
    ).toHaveLength(ALL.length);
  });
});

describe("codes with no parseable save time", () => {
  it("are excluded by every date filter, consistently", () => {
    // Previously `day` dropped these while `week` and `date range` kept them,
    // because every comparison against an Invalid Date is false.
    const nameless: QrCode = { name: "254.svg", data: "", image: "" };

    for (const filters of [["day"], ["week"], ["month"]] as FilterOption[][]) {
      expect(run({ qrCodes: [nameless], filters })).toEqual([]);
    }
    expect(
      run({
        qrCodes: [nameless],
        filters: ["date range"],
        dateRangeStart: new Date("2020-01-01"),
        dateRangeEnd: new Date("2030-01-01"),
      })
    ).toEqual([]);
  });

  it("are untouched when no date filter is active", () => {
    const nameless: QrCode = { name: "254.svg", data: "", image: "" };
    expect(run({ qrCodes: [nameless], filters: [] })).toEqual([nameless]);
  });
});

describe("text filters", () => {
  it("matches a match number by substring", () => {
    expect(names(run({ filters: ["match number"], matchNumberFilter: "Qual-2" }))).toEqual(
      [threeDaysAgo.name]
    );
  });

  it("matches a team number by substring", () => {
    expect(names(run({ filters: ["team number"], teamNumberFilter: "16" }))).toEqual([
      threeDaysAgo.name,
    ]);
  });

  it("is inert when the filter is enabled but the text is empty", () => {
    expect(run({ filters: ["team number"], teamNumberFilter: "" })).toHaveLength(
      ALL.length
    );
  });
});

describe("unscanned filter", () => {
  it("drops codes already scanned", () => {
    const scanned = code("254", "Qual-6", NOW, { scanned: true });
    const unscanned = code("254", "Qual-7", NOW);

    expect(run({ qrCodes: [scanned, unscanned], filters: ["unscanned"] })).toEqual([
      unscanned,
    ]);
  });
});

describe("combined filters", () => {
  it("applies every active filter", () => {
    // 254 saved 3 days ago passes both; 254 saved 40 days ago fails the week filter,
    // and the other teams fail the team filter.
    const oldSameTeam = code("254", "Qual-2", new Date(NOW.getTime() - 40 * DAY));
    const recentSameTeam = code("254", "Qual-3", new Date(NOW.getTime() - 3 * DAY));

    expect(
      names(
        run({
          qrCodes: [...ALL, oldSameTeam, recentSameTeam],
          filters: ["week", "team number"],
          teamNumberFilter: "254",
        })
      )
    ).toEqual([today.name, recentSameTeam.name]);
  });
});

describe("sorting", () => {
  it("orders by match number using the competition-level key", () => {
    const codes = [
      code("254", "Final-1", NOW),
      code("254", "Qual-10", NOW),
      code("254", "Qual-2", NOW),
      code("254", "Semis-1", NOW),
    ];
    const sorted = run({ qrCodes: codes, sortMode: "match number" });

    expect(sorted.map((c) => c.name.split("-")[1])).toEqual([
      "Qual",
      "Qual",
      "Semis",
      "Final",
    ]);
    expect(sorted[0].name).toContain("Qual-2");
    expect(sorted[1].name).toContain("Qual-10");
  });

  it("orders by save time when sorting by recent", () => {
    expect(names(run({ sortMode: "recent" }))).toEqual([
      fortyDaysAgo.name,
      tenDaysAgo.name,
      threeDaysAgo.name,
      today.name,
    ]);
  });

  it("reverses on descending", () => {
    expect(names(run({ sortMode: "recent", sortDirection: "descending" }))).toEqual([
      today.name,
      threeDaysAgo.name,
      tenDaysAgo.name,
      fortyDaysAgo.name,
    ]);
  });

  it("leaves order untouched when sorting is off", () => {
    expect(names(run({ sortMode: "none" }))).toEqual(names(ALL));
  });

  it("does not mutate the input array", () => {
    const input = [...ALL];
    run({ qrCodes: input, sortMode: "recent" });
    expect(names(input)).toEqual(names(ALL));
  });
});
