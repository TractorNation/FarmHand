/**
 * Display labels for schema field types.
 *
 * The single source of truth for the schema editor's type dropdown. Pairing each
 * label with its value here keeps multi-word types from needing a special case at
 * every place the two are converted.
 */
export const COMPONENT_TYPE_OPTIONS: { label: string; value: ComponentType }[] = [
  { label: "Checkbox", value: "checkbox" },
  { label: "Counter", value: "counter" },
  { label: "Dropdown", value: "dropdown" },
  { label: "Multiple Choice", value: "multiplechoice" },
  { label: "Text", value: "text" },
  { label: "Number", value: "number" },
  { label: "Slider", value: "slider" },
  { label: "Timer", value: "timer" },
  { label: "Grid", value: "grid" },
  { label: "Auto Path", value: "autopath" },
  { label: "Filler", value: "filler" },
];

export const COMPONENT_TYPE_LABELS = COMPONENT_TYPE_OPTIONS.map((o) => o.label);

export function componentTypeLabel(type: ComponentType | string): string {
  return (
    COMPONENT_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? String(type)
  );
}

export function componentTypeFromLabel(label: string): ComponentType {
  return (
    COMPONENT_TYPE_OPTIONS.find((o) => o.label === label)?.value ??
    (label.toLowerCase() as ComponentType)
  );
}

/**
 * Field types that always claim a whole section row, whatever `doubleWidth` says.
 *
 * Width is a property of these types rather than a schema author's choice: an auto
 * path is a scaled field image with a toolbar under it, and at a quarter or a half of
 * a row it is too small to trace on. Keeping the rule here lets every field in a
 * schema carry the same `doubleWidth` shape — Section applies the override.
 */
const FULL_WIDTH_TYPES: ReadonlySet<ComponentType> = new Set<ComponentType>([
  "autopath",
]);

/** Whether `type` ignores `doubleWidth` and spans its section's full width. */
export function isFullWidthType(type: ComponentType | string): boolean {
  return FULL_WIDTH_TYPES.has(type as ComponentType);
}
