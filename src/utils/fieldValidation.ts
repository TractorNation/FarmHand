/** Sentinel value dropdown and multiple-choice inputs sit at before a real selection. */
export const UNSET_OPTION = "Select an option...";

/**
 * Whether a required field is still unsatisfied.
 *
 * Only meaningful for required fields — optional fields are never invalid.
 */
export function isFieldInvalid(
  required: boolean,
  type: string,
  value: any
): boolean {
  if (!required) return false;

  if (value === undefined || value === null) return true;

  switch (type) {
    case "checkbox":
      return value === false;

    case "dropdown":
    case "multiplechoice":
      // The sentinel means "nothing picked yet" and must not pass as an answer.
      return value === "" || value === UNSET_OPTION;

    case "text":
      // Whitespace-only is not an answer.
      return String(value).trim() === "";

    case "number":
    case "counter":
    case "slider":
      return value === "";

    case "grid": {
      // Tolerate both "3x3:[]" and the older "3x3[]" shape rather than indexing
      // blindly into split(":") — value may not even be a string.
      const parsed = typeof value === "string" ? value.match(/\[(.*)\]/) : null;
      return !parsed || parsed[1].trim() === "";
    }

    case "autopath":
      // Satisfied by a drawn path OR an explicit "no autonomous" assertion, but
      // never by an untouched field.
      return !isAutoPathAnswered(value);

    default:
      return value === "";
  }
}

/**
 * An autopath value counts as answered when the scout either traced a path or
 * explicitly recorded that the robot had no autonomous. Kept here rather than in
 * PathCodec so isFieldInvalid has no import cycle with the codec.
 */
export function isAutoPathAnswered(value: any): boolean {
  if (!value || typeof value !== "object") return false;
  if (value.noAuto === true) return true;
  return Array.isArray(value.points) && value.points.length > 0;
}
