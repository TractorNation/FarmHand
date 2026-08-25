import { BitReader, BitWriter, bitsForCount } from "./BitStream";
import { decodeBase45, encodeBase45 } from "./Base45";

/**
 * Auto-path capture model and its bitstream codec.
 *
 * A path is stored as a quantized polyline plus a list of events anchored to
 * points along it. The action/piece/result vocabularies live in the schema, so the
 * payload carries only indices — see docs/WIRE_FORMAT.md.
 */

/** The field is quantized to a PATH_GRID x PATH_GRID lattice (7 bits per axis). */
export const PATH_GRID = 128;

/** Schema-authoring caps. Kept small so the on-screen chip row stays thumb-usable. */
export const MAX_PATH_PIECES = 3;
export const MAX_PATH_ACTIONS = 8;
export const MAX_PATH_RESULTS = 4;

/** Tokens are counted in 7 bits, so a path holds at most this many. */
export const MAX_PATH_TOKENS = 127;

/** Default Ramer-Douglas-Peucker epsilon, in grid units. */
export const DEFAULT_PATH_EPSILON = 2;

export interface PathPoint {
  /** 0..PATH_GRID-1 */
  x: number;
  /** 0..PATH_GRID-1 */
  y: number;
}

export interface PathEvent {
  /** Index of the point this event is anchored to. */
  afterPoint: number;
  /** Index into props.pathActions. */
  action: number;
  /** Index into props.gamePieces, or null when nothing was armed. */
  piece: number | null;
  /** Index into the action's results, or null when it declares none. */
  result: number | null;
}

export interface AutoPathValue {
  /** True when the scout explicitly recorded that the robot had no autonomous. */
  noAuto: boolean;
  points: PathPoint[];
  events: PathEvent[];
}

/** How an autopath field was answered. Surfaced verbatim in CSV exports. */
export type PathStatus = "PATH" | "NO_AUTO" | "NOT_RECORDED";

export const EMPTY_PATH: AutoPathValue = Object.freeze({
  noAuto: false,
  points: [],
  events: [],
}) as AutoPathValue;

/** Narrows an unknown stored value to an AutoPathValue, tolerating legacy junk. */
export function asAutoPathValue(value: any): AutoPathValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return EMPTY_PATH;
  }
  const points = Array.isArray(value.points)
    ? value.points
        .filter((p: any) => p && typeof p.x === "number" && typeof p.y === "number")
        .map((p: any) => ({ x: clampGrid(p.x), y: clampGrid(p.y) }))
    : [];
  const events = Array.isArray(value.events)
    ? value.events.filter(
        (e: any) => e && typeof e.afterPoint === "number" && typeof e.action === "number"
      )
    : [];
  return { noAuto: value.noAuto === true, points, events };
}

export function pathStatus(value: AutoPathValue): PathStatus {
  if (value.points.length > 0) return "PATH";
  return value.noAuto ? "NO_AUTO" : "NOT_RECORDED";
}

function clampGrid(n: number): number {
  return Math.max(0, Math.min(PATH_GRID - 1, Math.round(n)));
}

// ---------------------------------------------------------------------------
// Capture-side helpers
// ---------------------------------------------------------------------------

/**
 * Maps raw canvas coordinates onto the quantization grid.
 *
 * Quantizing at capture time (rather than at encode time) means what the scout
 * sees redrawn is exactly what will be transmitted.
 */
export function quantizePoint(
  px: number,
  py: number,
  width: number,
  height: number
): PathPoint {
  if (width <= 0 || height <= 0) return { x: 0, y: 0 };
  return {
    x: clampGrid((px / width) * (PATH_GRID - 1)),
    y: clampGrid((py / height) * (PATH_GRID - 1)),
  };
}

/**
 * Rotates a point 180° about the centre of the grid — both axes negated, never one.
 *
 * A scout on the far side of the arena sees the field upside down, so the canvas can
 * be drawn rotated to match. Points are still stored in the unrotated field frame so
 * that startZone and startX/startY stay comparable between scouts on opposite sides;
 * this converts between that frame and what is on screen. The rotation is its own
 * inverse, so one function serves both directions.
 */
export function flipPoint(point: PathPoint): PathPoint {
  return { x: PATH_GRID - 1 - point.x, y: PATH_GRID - 1 - point.y };
}

/** Inverse of quantizePoint, for redrawing a decoded path. */
export function dequantizePoint(
  point: PathPoint,
  width: number,
  height: number
): { x: number; y: number } {
  return {
    x: (point.x / (PATH_GRID - 1)) * width,
    y: (point.y / (PATH_GRID - 1)) * height,
  };
}

/** Perpendicular distance from `p` to the segment `a`-`b`. */
function perpendicularDistance(p: PathPoint, a: PathPoint, b: PathPoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (dx === 0 && dy === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  // Twice the triangle area over the base length.
  return Math.abs(dy * (p.x - a.x) - dx * (p.y - a.y)) / Math.hypot(dx, dy);
}

/**
 * Ramer-Douglas-Peucker simplification.
 *
 * A finger drag produces hundreds of points; scouting needs the ~10-20 that define
 * the shape. This is the single largest size win in the path payload.
 *
 * `keepIndices` are points that must survive because an event is anchored to them.
 */
export function rdpSimplify(
  points: PathPoint[],
  epsilon = DEFAULT_PATH_EPSILON,
  keepIndices: ReadonlySet<number> = new Set()
): { points: PathPoint[]; indexMap: number[] } {
  if (points.length <= 2) {
    return { points: [...points], indexMap: points.map((_, i) => i) };
  }

  const keep = new Array<boolean>(points.length).fill(false);
  keep[0] = true;
  keep[points.length - 1] = true;
  for (const i of keepIndices) {
    if (i >= 0 && i < points.length) keep[i] = true;
  }

  // Iterative to avoid deep recursion on very long drags.
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length > 0) {
    const [first, last] = stack.pop()!;
    if (last <= first + 1) continue;

    let maxDist = -1;
    let maxIdx = -1;
    for (let i = first + 1; i < last; i++) {
      const d = perpendicularDistance(points[i], points[first], points[last]);
      if (d > maxDist) {
        maxDist = d;
        maxIdx = i;
      }
    }

    if (maxDist > epsilon && maxIdx !== -1) {
      keep[maxIdx] = true;
      stack.push([first, maxIdx], [maxIdx, last]);
    } else {
      // Anchored points inside a discarded span still need their own subdivision
      // so their segments stay attached to the simplified line.
      for (let i = first + 1; i < last; i++) {
        if (keep[i]) stack.push([first, i], [i, last]);
      }
    }
  }

  const kept: PathPoint[] = [];
  // indexMap[originalIndex] = index into `kept`, or -1 when dropped.
  const indexMap = new Array<number>(points.length).fill(-1);
  for (let i = 0; i < points.length; i++) {
    if (keep[i]) {
      indexMap[i] = kept.length;
      kept.push(points[i]);
    }
  }

  return { points: kept, indexMap };
}

/**
 * Simplifies a captured path while keeping every event attached to a surviving
 * point, and drops consecutive duplicate points that survive quantization.
 */
export function simplifyPath(
  value: AutoPathValue,
  epsilon = DEFAULT_PATH_EPSILON
): AutoPathValue {
  if (value.points.length <= 2) return value;

  const anchored = new Set(value.events.map((e) => e.afterPoint));
  const { points, indexMap } = rdpSimplify(value.points, epsilon, anchored);

  const events = value.events.map((e) => {
    // Anchors were forced to survive, but clamp defensively.
    const mapped = indexMap[e.afterPoint];
    return { ...e, afterPoint: mapped === -1 ? points.length - 1 : mapped };
  });

  return { ...value, points, events };
}

// ---------------------------------------------------------------------------
// Bitstream codec
// ---------------------------------------------------------------------------

/** Per-field vocabulary sizes the codec needs from the schema. */
export interface PathVocabulary {
  actions: PathAction[];
  pieces: PathOption[];
}

export function pathVocabulary(props?: ComponentProps): PathVocabulary {
  return {
    actions: props?.pathActions ?? [],
    pieces: props?.gamePieces ?? [],
  };
}

const DELTA_SMALL_BITS = 4; // signed -8..7
const DELTA_LARGE_BITS = 8; // signed -128..127
const DELTA_SMALL_BIAS = 8;
const DELTA_LARGE_BIAS = 128;

function writeDelta(w: BitWriter, delta: number): void {
  if (delta >= -DELTA_SMALL_BIAS && delta < DELTA_SMALL_BIAS) {
    w.writeBit(0).writeBits(delta + DELTA_SMALL_BIAS, DELTA_SMALL_BITS);
  } else {
    w.writeBit(1).writeBits(delta + DELTA_LARGE_BIAS, DELTA_LARGE_BITS);
  }
}

function readDelta(r: BitReader): number {
  return r.readBit()
    ? r.readBits(DELTA_LARGE_BITS) - DELTA_LARGE_BIAS
    : r.readBits(DELTA_SMALL_BITS) - DELTA_SMALL_BIAS;
}

/**
 * Appends an auto-path value to a bitstream.
 *
 * Layout (see docs/WIRE_FORMAT.md):
 *   [present:1]
 *     present=0 -> [explicitNoAuto:1]
 *     present=1 -> [tokenCount:7][startX:7][startY:7] tokenCount x token
 *   token: [type:1] MOVE=[escX:1][dx:4|8][escY:1][dy:4|8]
 *                   EVENT=[action:A][piece:P?][result:R?]
 */
export function encodePath(
  w: BitWriter,
  raw: AutoPathValue,
  vocab: PathVocabulary
): void {
  const value = asAutoPathValue(raw);

  if (value.points.length === 0) {
    w.writeBit(0);
    w.writeBit(value.noAuto ? 1 : 0);
    return;
  }

  w.writeBit(1);

  const actionBits = bitsForCount(vocab.actions.length);
  const pieceBits =
    vocab.pieces.length > 0 ? bitsForCount(vocab.pieces.length + 1) : 0;

  // Interleave moves and events in point order so a decoder can rebuild both
  // without a second pass.
  type Token = { move?: PathPoint; event?: PathEvent };
  const tokens: Token[] = [];
  const eventsAt = new Map<number, PathEvent[]>();
  for (const e of value.events) {
    const list = eventsAt.get(e.afterPoint);
    if (list) list.push(e);
    else eventsAt.set(e.afterPoint, [e]);
  }

  for (const e of eventsAt.get(0) ?? []) tokens.push({ event: e });
  for (let i = 1; i < value.points.length; i++) {
    tokens.push({ move: value.points[i] });
    for (const e of eventsAt.get(i) ?? []) tokens.push({ event: e });
  }

  if (tokens.length > MAX_PATH_TOKENS) tokens.length = MAX_PATH_TOKENS;

  w.writeBits(tokens.length, 7);
  w.writeBits(value.points[0].x, 7);
  w.writeBits(value.points[0].y, 7);

  let prev = value.points[0];
  for (const token of tokens) {
    if (token.move) {
      w.writeBit(0);
      writeDelta(w, token.move.x - prev.x);
      writeDelta(w, token.move.y - prev.y);
      prev = token.move;
    } else {
      const e = token.event!;
      w.writeBit(1);
      w.writeBits(clampIndex(e.action, vocab.actions.length), actionBits);
      if (pieceBits > 0) {
        // 0 means "no piece armed"; real pieces are 1-based on the wire.
        const pieceCode =
          e.piece == null ? 0 : clampIndex(e.piece, vocab.pieces.length) + 1;
        w.writeBits(pieceCode, pieceBits);
      }
      const results = vocab.actions[clampIndex(e.action, vocab.actions.length)]?.results;
      const resultBits = bitsForCount(results?.length ?? 0);
      if (resultBits > 0) {
        w.writeBits(clampIndex(e.result ?? 0, results!.length), resultBits);
      }
    }
  }
}

function clampIndex(index: number, count: number): number {
  if (count <= 0) return 0;
  return Math.max(0, Math.min(count - 1, Math.trunc(index)));
}

export function decodePath(r: BitReader, vocab: PathVocabulary): AutoPathValue {
  if (!r.readBit()) {
    return { noAuto: r.readBit() === 1, points: [], events: [] };
  }

  const actionBits = bitsForCount(vocab.actions.length);
  const pieceBits =
    vocab.pieces.length > 0 ? bitsForCount(vocab.pieces.length + 1) : 0;

  const tokenCount = r.readBits(7);
  const points: PathPoint[] = [{ x: r.readBits(7), y: r.readBits(7) }];
  const events: PathEvent[] = [];

  for (let i = 0; i < tokenCount; i++) {
    if (r.readBit() === 0) {
      const prev = points[points.length - 1];
      const dx = readDelta(r);
      const dy = readDelta(r);
      points.push({ x: clampGrid(prev.x + dx), y: clampGrid(prev.y + dy) });
    } else {
      const action = r.readBits(actionBits);
      let piece: number | null = null;
      if (pieceBits > 0) {
        const code = r.readBits(pieceBits);
        piece = code === 0 ? null : code - 1;
      }
      const results = vocab.actions[action]?.results;
      const resultBits = bitsForCount(results?.length ?? 0);
      const result = resultBits > 0 ? r.readBits(resultBits) : null;
      events.push({ afterPoint: points.length - 1, action, piece, result });
    }
  }

  return { noAuto: false, points, events };
}

/**
 * Encodes a path on its own, outside a match payload, as a Base45 string.
 *
 * This is what the `... (encoded)` CSV column carries: a self-contained blob the
 * analysis side can decode with only the schema's action/piece lists and the spec.
 */
export function encodePathStandalone(
  value: AutoPathValue,
  vocab: PathVocabulary
): string {
  const w = new BitWriter();
  encodePath(w, value, vocab);
  return encodeBase45(w.toBytes());
}

export function decodePathStandalone(
  text: string,
  vocab: PathVocabulary
): AutoPathValue {
  return decodePath(new BitReader(decodeBase45(text)), vocab);
}

// ---------------------------------------------------------------------------
// Export summary
// ---------------------------------------------------------------------------

export interface PathSummary {
  status: PathStatus;
  /** 3x3 zone label of the start point: column letter A-C, row digit 1-3. */
  startZone: string;
  startX: number | null;
  startY: number | null;
  /** Action labels in order, joined with ">". */
  actionSequence: string;
  /** Action label → number of events. Every configured action gets a key. */
  actionCounts: Record<string, number>;
}

/** 3x3 zone label, e.g. "A1" top-left, "C3" bottom-right. */
export function startZoneLabel(point: PathPoint): string {
  const third = (n: number) => Math.min(2, Math.floor((n / PATH_GRID) * 3));
  return `${"ABC"[third(point.x)]}${third(point.y) + 1}`;
}

/**
 * Flattens a path into the scalar columns the CSV export publishes.
 *
 * Empty paths leave the positional/sequence fields null or blank so that a genuine
 * zero is distinguishable from an absence downstream.
 */
export function pathToSummary(
  raw: any,
  vocab: PathVocabulary
): PathSummary {
  const value = asAutoPathValue(raw);
  const status = pathStatus(value);

  const actionCounts: Record<string, number> = {};
  for (const action of vocab.actions) actionCounts[action.label] = 0;

  if (status !== "PATH") {
    return {
      status,
      startZone: "",
      startX: null,
      startY: null,
      actionSequence: "",
      actionCounts,
    };
  }

  const labels: string[] = [];
  for (const event of value.events) {
    const action = vocab.actions[event.action];
    if (!action) continue;
    const result =
      event.result != null ? action.results?.[event.result] : undefined;
    labels.push(result ? `${action.label}:${result}` : action.label);
    actionCounts[action.label] = (actionCounts[action.label] ?? 0) + 1;
  }

  return {
    status,
    startZone: startZoneLabel(value.points[0]),
    startX: value.points[0].x,
    startY: value.points[0].y,
    actionSequence: labels.join(">"),
    actionCounts,
  };
}
