import { describe, expect, it } from "vitest";
import { BitReader, BitWriter } from "./BitStream";
import {
  AutoPathValue,
  PATH_GRID,
  PathVocabulary,
  asAutoPathValue,
  decodePath,
  dequantizePoint,
  encodePath,
  flipPoint,
  pathStatus,
  pathToSummary,
  quantizePoint,
  rdpSimplify,
  simplifyPath,
  startZoneLabel,
} from "./PathCodec";

const VOCAB: PathVocabulary = {
  actions: [
    { label: "Pickup", icon: "circle" },
    { label: "Score", icon: "target", results: ["Made", "Missed"] },
    { label: "Defense", icon: "shield" },
  ],
  pieces: [
    { label: "Fuel", icon: "circle" },
    { label: "Gear", icon: "hexagon" },
  ],
};

/** Encode then decode through a real bitstream. */
function roundTrip(value: AutoPathValue, vocab = VOCAB): AutoPathValue {
  const w = new BitWriter();
  encodePath(w, value, vocab);
  return decodePath(new BitReader(w.toBytes()), vocab);
}

function payloadBits(value: AutoPathValue, vocab = VOCAB): number {
  const w = new BitWriter();
  encodePath(w, value, vocab);
  return w.bitLength;
}

describe("path status", () => {
  it("distinguishes an explicit no-auto from an unrecorded field", () => {
    expect(pathStatus({ noAuto: true, points: [], events: [] })).toBe("NO_AUTO");
    expect(pathStatus({ noAuto: false, points: [], events: [] })).toBe(
      "NOT_RECORDED"
    );
    expect(
      pathStatus({ noAuto: false, points: [{ x: 1, y: 1 }], events: [] })
    ).toBe("PATH");
  });

  it("keeps the two empty states distinct across a round trip", () => {
    // The whole reason the payload spends a second bit on this.
    expect(roundTrip({ noAuto: true, points: [], events: [] })).toEqual({
      noAuto: true,
      points: [],
      events: [],
    });
    expect(roundTrip({ noAuto: false, points: [], events: [] })).toEqual({
      noAuto: false,
      points: [],
      events: [],
    });
  });

  it("encodes both empty states in 2 bits", () => {
    expect(payloadBits({ noAuto: true, points: [], events: [] })).toBe(2);
    expect(payloadBits({ noAuto: false, points: [], events: [] })).toBe(2);
  });
});

describe("asAutoPathValue", () => {
  it("coerces junk to an empty path rather than throwing", () => {
    for (const junk of [null, undefined, "3x3:[]", 42, []]) {
      expect(asAutoPathValue(junk)).toEqual({
        noAuto: false,
        points: [],
        events: [],
      });
    }
  });

  it("drops malformed points and clamps in-range ones", () => {
    const v = asAutoPathValue({
      points: [{ x: -5, y: 999 }, { x: "a", y: 1 }, { x: 3.6, y: 4.2 }],
      events: [{ afterPoint: 0, action: 0 }, { nope: true }],
    });
    expect(v.points).toEqual([
      { x: 0, y: PATH_GRID - 1 },
      { x: 4, y: 4 },
    ]);
    expect(v.events).toHaveLength(1);
  });
});

describe("quantization", () => {
  it("maps canvas corners onto grid corners", () => {
    expect(quantizePoint(0, 0, 400, 200)).toEqual({ x: 0, y: 0 });
    expect(quantizePoint(400, 200, 400, 200)).toEqual({
      x: PATH_GRID - 1,
      y: PATH_GRID - 1,
    });
  });

  it("clamps out-of-bounds input", () => {
    expect(quantizePoint(-50, 900, 400, 200)).toEqual({
      x: 0,
      y: PATH_GRID - 1,
    });
  });

  it("survives a zero-sized canvas", () => {
    expect(quantizePoint(10, 10, 0, 0)).toEqual({ x: 0, y: 0 });
  });

  it("round-trips within one grid cell", () => {
    const w = 800;
    const h = 400;
    for (const [px, py] of [[0, 0], [123, 45], [799, 399], [400, 200]]) {
      const q = quantizePoint(px, py, w, h);
      const back = dequantizePoint(q, w, h);
      expect(Math.abs(back.x - px)).toBeLessThanOrEqual(w / PATH_GRID);
      expect(Math.abs(back.y - py)).toBeLessThanOrEqual(h / PATH_GRID);
    }
  });
});

describe("flipPoint", () => {
  it("is a 180 degree rotation, not a mirror", () => {
    // A mirror would move one axis and leave the other alone. Both must move, or a
    // path drawn from the far side of the arena lands on the wrong half of the field.
    expect(flipPoint({ x: 10, y: 30 })).toEqual({ x: 117, y: 97 });
  });

  it("maps opposite corners onto each other", () => {
    expect(flipPoint({ x: 0, y: 0 })).toEqual({ x: 127, y: 127 });
    expect(flipPoint({ x: 127, y: 0 })).toEqual({ x: 0, y: 127 });
  });

  it("fixes the centre of the grid", () => {
    const centre = (PATH_GRID - 1) / 2;
    expect(flipPoint({ x: centre, y: centre })).toEqual({ x: centre, y: centre });
  });

  it("is its own inverse, so one call serves both directions", () => {
    for (const point of [
      { x: 0, y: 0 },
      { x: 127, y: 127 },
      { x: 12, y: 99 },
      { x: 64, y: 3 },
    ]) {
      expect(flipPoint(flipPoint(point))).toEqual(point);
    }
  });
});

describe("rdpSimplify", () => {
  it("collapses a straight line to its endpoints", () => {
    const line = Array.from({ length: 20 }, (_, i) => ({ x: i, y: 0 }));
    expect(rdpSimplify(line, 2).points).toEqual([
      { x: 0, y: 0 },
      { x: 19, y: 0 },
    ]);
  });

  it("keeps a corner that exceeds epsilon", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 5, y: 20 },
      { x: 10, y: 0 },
    ];
    expect(rdpSimplify(points, 2).points).toHaveLength(3);
  });

  it("keeps every point within epsilon of the original line", () => {
    // A hand-drawn arc: epsilon 2 must not deviate by more than 2 grid units.
    const arc = Array.from({ length: 60 }, (_, i) => ({
      x: Math.round(i * 2),
      y: Math.round(40 * Math.sin((i / 59) * Math.PI)),
    }));
    const { points } = rdpSimplify(arc, 2);
    expect(points.length).toBeLessThan(arc.length);

    for (const original of arc) {
      // Distance from the original point to the nearest simplified vertex segment.
      let best = Infinity;
      for (let i = 0; i < points.length - 1; i++) {
        const a = points[i];
        const b = points[i + 1];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len2 = dx * dx + dy * dy;
        const t =
          len2 === 0
            ? 0
            : Math.max(
                0,
                Math.min(
                  1,
                  ((original.x - a.x) * dx + (original.y - a.y) * dy) / len2
                )
              );
        best = Math.min(
          best,
          Math.hypot(original.x - (a.x + t * dx), original.y - (a.y + t * dy))
        );
      }
      expect(best).toBeLessThanOrEqual(2.0001);
    }
  });

  it("preserves points that events are anchored to", () => {
    const line = Array.from({ length
: 20 }, (_, i) => ({ x: i, y: 0 }));
    const { points, indexMap } = rdpSimplify(line, 5, new Set([7]));
    expect(indexMap[7]).toBeGreaterThanOrEqual(0);
    expect(points[indexMap[7]]).toEqual({ x: 7, y: 0 });
  });

  it("leaves short paths untouched", () => {
    const two = [{ x: 1, y: 2 }, { x: 3, y: 4 }];
    expect(rdpSimplify(two, 2).points).toEqual(two);
  });
});

describe("simplifyPath", () => {
  it("keeps events attached to surviving points", () => {
    const points = Array.from({ length: 40 }, (_, i) => ({
      x: i * 3,
      y: Math.round(10 * Math.sin(i / 4)),
    }));
    const value: AutoPathValue = {
      noAuto: false,
      points,
      events: [
        { afterPoint: 0, action: 0, piece: 0, result: null },
        { afterPoint: 17, action: 1, piece: 0, result: 0 },
        { afterPoint: 39, action: 2, piece: null, result: null },
      ],
    };

    const simplified = simplifyPath(value, 2);
    expect(simplified.points.length).toBeLessThan(points.length);

    // Every event still points at a real index, and at the same physical location.
    simplified.events.forEach((e, i) => {
      expect(e.afterPoint).toBeGreaterThanOrEqual(0);
      expect(e.afterPoint).toBeLessThan(simplified.points.length);
      expect(simplified.points[e.afterPoint]).toEqual(
        points[value.events[i].afterPoint]
      );
    });
  });
});

describe("encodePath / decodePath", () => {
  it("round-trips a path with interleaved events", () => {
    const value: AutoPathValue = {
      noAuto: false,
      points: [
        { x: 12, y: 64 },
        { x: 20, y: 61 },
        { x: 31, y: 55 },
        { x: 33, y: 57 },
      ],
      events: [
        { afterPoint: 1, action: 0, piece: 0, result: null },
        { afterPoint: 2, action: 1, piece: 0, result: 1 },
        { afterPoint: 3, action: 2, piece: null, result: null },
      ],
    };

    expect(roundTrip(value)).toEqual(value);
  });

  it("round-trips an event anchored to the start point", () => {
    const value: AutoPathValue = {
      noAuto: false,
      points: [{ x: 5, y: 5 }, { x: 9, y: 9 }],
      events: [{ afterPoint: 0, action: 1, piece: 1, result: 0 }],
    };
    expect(roundTrip(value)).toEqual(value);
  });

  it("handles deltas that need the escape width", () => {
    // A jump of more than +/-8 grid units must use the 8-bit form.
    const value: AutoPathValue = {
      noAuto: false,
      points: [
        { x: 0, y: 127 },
        { x: 127, y: 0 },
        { x: 64, y: 64 },
      ],
      events: [],
    };
    expect(roundTrip(value)).toEqual(value);
  });

  it("round-trips a single-point path", () => {
    const value: AutoPathValue = {
      noAuto: false,
      points: [{ x: 42, y: 99 }],
      events: [],
    };
    expect(roundTrip(value)).toEqual(value);
  });

  it("round-trips with no pieces configured", () => {
    const vocab: PathVocabulary = {
      actions: [{ label: "Score", icon: "target" }],
      pieces: [],
    };
    const value: AutoPathValue = {
      noAuto: false,
      points: [{ x: 1, y: 2 }, { x: 5, y: 6 }],
      events: [{ afterPoint: 1, action: 0, piece: null, result: null }],
    };
    expect(roundTrip(value, vocab)).toEqual(value);
  });

  it("spends zero bits on a single-action vocabulary", () => {
    const one: PathVocabulary = {
      actions: [{ label: "Score", icon: "target" }],
      pieces: [],
    };
    const value: AutoPathValue = {
      noAuto: false,
      points: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
      events: [{ afterPoint: 1, action: 0, piece: null, result: null }],
    };
    // present(1) + count(7) + start(14) + move(1+5+5) + event(1+0+0) = 34
    expect(payloadBits(value, one)).toBe(34);
    expect(roundTrip(value, one)).toEqual(value);
  });

  it("stays within the documented size budget", () => {
    // 20 points + 8 events should land around 35 bytes.
    const points = Array.from({ length: 20 }, (_, i) => ({
      x: 10 + i * 3,
      y: 60 + ((i * 7) % 11),
    }));
    const events = Array.from({ length: 8 }, (_, i) => ({
      afterPoint: i * 2 + 1,
      action: i % 3,
      piece: i % 2 === 0 ? 0 : 1,
      result: i % 3 === 1 ? 1 : null,
    }));
    const bits = payloadBits({ noAuto: false, points, events });
    expect(Math.ceil(bits / 8)).toBeLessThanOrEqual(40);
    expect(roundTrip({ noAuto: false, points, events })).toEqual({
      noAuto: false,
      points,
      events,
    });
  });

  it("truncates rather than corrupting when over the token cap", () => {
    const points = Array.from({ length: 200 }, (_, i) => ({
      x: i % PATH_GRID,
      y: 1,
    }));
    const decoded = roundTrip({ noAuto: false, points, events: [] });
    // 127 move tokens plus the absolute start point.
    expect(decoded.points).toHaveLength(128);
  });

  it("clamps out-of-range action and piece indices", () => {
    const value: AutoPathValue = {
      noAuto: false,
      points: [{ x: 1, y: 1 }, { x: 2, y: 2 }],
      events: [{ afterPoint: 1, action: 99, piece: 99, result: 99 }],
    };
    const decoded = roundTrip(value);
    expect(decoded.events[0].action).toBe(VOCAB.actions.length - 1);
    expect(decoded.events[0].piece).toBe(VOCAB.pieces.length - 1);
  });
});

describe("startZoneLabel", () => {
  it.each([
    [{ x: 0, y: 0 }, "A1"],
    [{ x: 127, y: 127 }, "C3"],
    [{ x: 64, y: 64 }, "B2"],
    [{ x: 10, y: 120 }, "A3"],
  ])("labels %j as %s", (point, expected) => {
    expect(startZoneLabel(point)).toBe(expected);
  });
});

describe("pathToSummary", () => {
  it("summarizes a drawn path", () => {
    const summary = pathToSummary(
      {
        noAuto: false,
        points: [{ x: 12, y: 64 }, { x: 20, y: 61 }, { x: 31, y: 55 }],
        events: [
          { afterPoint: 1, action: 0, piece: 0, result: null },
          { afterPoint: 2, action: 1, piece: 0, result: 0 },
          { afterPoint: 2, action: 1, piece: 0, result: 1 },
        ],
      },
      VOCAB
    );

    expect(summary.status).toBe("PATH");
    expect(summary.startZone).toBe("A2");
    expect(summary.startX).toBe(12);
    expect(summary.startY).toBe(64);
    expect(summary.actionSequence).toBe("Pickup>Score:Made>Score:Missed");
    expect(summary.actionCounts).toEqual({ Pickup: 1, Score: 2, Defense: 0 });
  });

  it("blanks positional columns for the empty states so zero stays meaningful", () => {
    for (const [value, status] of [
      [{ noAuto: true, points: [], events: [] }, "NO_AUTO"],
      [{ noAuto: false, points: [], events: [] }, "NOT_RECORDED"],
    ] as const) {
      const summary = pathToSummary(value, VOCAB);
      expect(summary.status).toBe(status);
      expect(summary.startX).toBeNull();
      expect(summary.startY).toBeNull();
      expect(summary.startZone).toBe("");
      expect(summary.actionSequence).toBe("");
      // Every configured action still gets a column, all zero.
      expect(summary.actionCounts).toEqual({ Pickup: 0, Score: 0, Defense: 0 });
    }
  });
});
