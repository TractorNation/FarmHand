import { orderedFields } from "../utils/schemaFields";

/**
 * Chart axes reference a schema field by the string `"Section Name - Field Name"`.
 *
 * Both directions live here so the format is defined once — parse and join through
 * these rather than splitting the string at the call site.
 *
 * Resolution returns the field's **flat index** from `orderedFields`, which is the
 * same ordering the wire format and exports use — charts index `decoded.data` by it,
 * so a second, independently-derived ordering would silently mis-attribute values.
 */

export interface FieldRef {
  section: string;
  field: string;
}

/** Reference to one resolved field: where it sits and what it is. */
export interface ResolvedField {
  index: number;
  type: ComponentType;
  props?: ComponentProps;
}

const SEPARATOR = " - ";

/**
 * Splits an axis reference into section and field.
 *
 * A reference without the separator is treated as a bare field name matching any
 * section, which is how older saved analyses stored it.
 */
export function parseFieldRef(ref: string | undefined | null): FieldRef | null {
  if (!ref) return null;
  const parts = ref.split(SEPARATOR);
  if (parts.length === 2) {
    return { section: parts[0], field: parts[1] };
  }
  return { section: "", field: ref };
}

/** Builds an axis reference string. Inverse of {@link parseFieldRef}. */
export function formatFieldRef(section: string, field: string): string {
  return section ? `${section}${SEPARATOR}${field}` : field;
}

/**
 * Resolves a reference to a field's flat index, type and props.
 *
 * An empty `section` matches any section — the first field with that name wins.
 */
export function findFieldByRef(
  schema: Schema,
  ref: FieldRef | null
): ResolvedField | null {
  if (!ref) return null;

  let index = 0;
  for (const section of schema.sections) {
    for (const field of section.fields) {
      if (
        field.name === ref.field &&
        (!ref.section || section.title === ref.section)
      ) {
        return { index, type: field.type, props: field.props };
      }
      index++;
    }
  }
  return null;
}

/** Convenience: resolve straight from the stored axis string. */
export function resolveFieldRef(
  schema: Schema,
  ref: string | undefined | null
): ResolvedField | null {
  return findFieldByRef(schema, parseFieldRef(ref));
}

/** Every field a chart needs, resolved once. */
export interface ChartFields {
  x: ResolvedField | null;
  y: ResolvedField | null;
  /** Index of the series-splitting field, or -1 when the chart is not grouped. */
  groupByIndex: number;
  /** Y is a slider configured to select a range, so its values are `[min, max]`. */
  isRangeSlider: boolean;
}

/**
 * Resolves a chart's axes and grouping field.
 *
 * Line and scatter charts fall back to grouping by Team Number when the X axis is
 * Match Number, which is what makes "one line per team over the event" the default.
 */
export function resolveChartFields(chart: Chart, schema: Schema): ChartFields {
  const xRef = parseFieldRef(chart.xAxis);
  const yRef = parseFieldRef(chart.yAxis);

  const x = findFieldByRef(schema, xRef);
  const y = findFieldByRef(schema, yRef);

  let groupByIndex = -1;
  if ((chart.type === "line" || chart.type === "scatter") && chart.groupBy) {
    const groupRef = parseFieldRef(chart.groupBy);
    // Only an explicit "Section - Field" reference counts here, matching the
    // original behaviour.
    if (chart.groupBy.split(SEPARATOR).length === 2) {
      groupByIndex = findFieldByRef(schema, groupRef)?.index ?? -1;
    }
  } else if (
    chart.type === "line" ||
    (chart.type === "scatter" && xRef?.field === "Match Number")
  ) {
    groupByIndex =
      findFieldByRef(schema, { section: "", field: "Team Number" })?.index ?? -1;
  }

  return {
    x,
    y,
    groupByIndex,
    isRangeSlider: y?.type === "slider" && y.props?.selectsRange === true,
  };
}

/** Flat index of the Team Number field, or -1. Used to label counted series. */
export function teamNumberIndex(schema: Schema): number {
  return (
    findFieldByRef(schema, { section: "", field: "Team Number" })?.index ?? -1
  );
}

/** Guard so callers do not have to know the ordering source. */
export function fieldCount(schema: Schema): number {
  return orderedFields(schema).length;
}
