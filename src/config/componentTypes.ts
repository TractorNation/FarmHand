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
