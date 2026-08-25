import { orderedFields } from "./MatchCodec";
import {
  PathVocabulary,
  asAutoPathValue,
  encodePathStandalone,
  pathToSummary,
  pathVocabulary,
} from "./PathCodec";

/**
 * Column layout for match exports.
 *
 * Headers and row values are produced from one shared plan so they cannot drift —
 * a classic export bug when the two are built by separate loops.
 *
 * The published column contract lives in docs/WIRE_FORMAT.md.
 */

type FieldPlan =
  | { kind: "scalar"; id: number; header: string }
  | { kind: "path"; id: number; header: string; vocab: PathVocabulary };

export interface ExportPlan {
  headers: string[];
  /** Extracts one row from a record keyed by field id. Aligned with `headers`. */
  extract: (record: Record<string | number, any>) => any[];
}

/** Column suffixes appended to an autopath field's name, in order. */
function pathHeaders(fieldName: string, vocab: PathVocabulary): string[] {
  return [
    `${fieldName} Status`,
    `${fieldName} Start Zone`,
    `${fieldName} Start X`,
    `${fieldName} Start Y`,
    `${fieldName} Action Sequence`,
    ...vocab.actions.map((a) => `${fieldName} ${a.label} Count`),
    `${fieldName} (encoded)`,
  ];
}

function pathValues(raw: any, vocab: PathVocabulary): any[] {
  const value = asAutoPathValue(raw);
  const summary = pathToSummary(value, vocab);

  // Blank rather than zero for the empty states, so a genuine zero stays meaningful.
  const hasPath = summary.status === "PATH";

  return [
    summary.status,
    summary.startZone,
    summary.startX ?? "",
    summary.startY ?? "",
    summary.actionSequence,
    ...vocab.actions.map((a) => (hasPath ? summary.actionCounts[a.label] ?? 0 : "")),
    hasPath ? encodePathStandalone(value, vocab) : "",
  ];
}

export function planMatchExport(schema: Schema): ExportPlan {
  const plans: FieldPlan[] = orderedFields(schema).map((field) =>
    field.type === "autopath"
      ? {
          kind: "path" as const,
          id: field.id,
          header: field.name,
          vocab: pathVocabulary(field.props),
        }
      : { kind: "scalar" as const, id: field.id, header: field.name }
  );

  const headers = plans.flatMap((plan) =>
    plan.kind === "path" ? pathHeaders(plan.header, plan.vocab) : [plan.header]
  );

  const extract = (record: Record<string | number, any>) =>
    plans.flatMap((plan) =>
      plan.kind === "path"
        ? pathValues(record[plan.id], plan.vocab)
        : [record[plan.id]]
    );

  return { headers, extract };
}

/**
 * Nested JSON shape for one match: field name → value, with autopath fields
 * expanded to a structured object rather than the flat CSV columns.
 */
export function buildJsonRecord(
  schema: Schema,
  record: Record<string | number, any>
): Record<string, any> {
  const entry: Record<string, any> = {};

  for (const field of orderedFields(schema)) {
    if (field.type === "filler") continue;

    if (field.type === "autopath") {
      const vocab = pathVocabulary(field.props);
      const value = asAutoPathValue(record[field.id]);
      const summary = pathToSummary(value, vocab);

      entry[field.name] = {
        status: summary.status,
        grid: 128,
        startZone: summary.startZone || null,
        points: value.points.map((p) => [p.x, p.y]),
        events: value.events.map((e) => ({
          afterPoint: e.afterPoint,
          action: vocab.actions[e.action]?.label ?? null,
          piece: e.piece == null ? null : vocab.pieces[e.piece]?.label ?? null,
          result:
            e.result == null
              ? null
              : vocab.actions[e.action]?.results?.[e.result] ?? null,
        })),
      };
      continue;
    }

    entry[field.name] = record[field.id];
  }

  return entry;
}

/** Quotes one CSV cell. */
export function csvCell(value: any): string {
  if (value === undefined || value === null) return "";
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(headers: string[], rows: any[][]): string {
  return [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}
