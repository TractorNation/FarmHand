/**
 * Field lookup over a schema.
 *
 * `orderedFields` is **the** definition of a schema's flat field order, and that
 * order is load-bearing in three separate places: the bit order of a match payload,
 * the column order of an export, and the index used to pull a value out of a decoded
 * record for charting. Use this rather than re-deriving
 * `sections.flatMap(s => s.fields)` at the call site: a drifted copy silently
 * attributes a decoded value to the wrong field.
 */

/** Every field in the schema, section by section, in declaration order. */
export function orderedFields(schema: Schema): Component[] {
  return schema.sections.flatMap((section) => section.fields);
}

/**
 * Finds a field by name, optionally restricted to one section.
 *
 * Returns its flat index alongside the field, because callers that read decoded
 * match data need the index into {@link orderedFields}, not just the definition.
 * Pass an empty `sectionName` to search every section.
 */
export function findFieldByName(
  schema: Schema,
  fieldName: string,
  sectionName = ""
): { field: Component; index: number } | null {
  const wanted = fieldName.toLowerCase().trim();
  const wantedSection = sectionName.toLowerCase().trim();

  let index = 0;
  for (const section of schema.sections) {
    const sectionMatches =
      wantedSection === "" || section.title.toLowerCase().trim() === wantedSection;

    for (const field of section.fields) {
      if (sectionMatches && field.name.toLowerCase().trim() === wanted) {
        return { field, index };
      }
      index++;
    }
  }
  return null;
}

/**
 * Gets a named field's value from match data, stripped to filename-safe characters.
 *
 * Used to name saved QR files, hence the character filtering.
 */
export function getFieldValueByName(
  fieldName: string,
  schema: Schema,
  matchData: Map<number, any>
): string | null {
  const found = findFieldByName(schema, fieldName);
  if (!found) return null;

  const value = matchData.get(found.field.id);
  // null means "never recorded" (decoded records do not substitute defaults), so it
  // has to be treated as absent — String(null) would otherwise put the literal text
  // "null" into a QR filename.
  return value !== undefined && value !== null
    ? String(value).replace(/[^a-zA-Z0-9_-]/g, "")
    : null;
}

/**
 * Returns the schema-defined default for a named field, or null if it has none.
 * Used as a fallback when a field was never interacted with.
 */
export function getFieldDefault(fieldName: string, schema: Schema): string | null {
  const found = findFieldByName(schema, fieldName);
  if (!found) return null;

  return found.field.props?.default !== undefined
    ? String(found.field.props.default).replace(/[^a-zA-Z0-9_-]/g, "")
    : null;
}

/** Re-keys a record object (field id → value) as a Map. */
export function matchDataJsonToMap(object: any) {
  const map = new Map<number, any>();
  for (const key in object) {
    if (Object.prototype.hasOwnProperty.call(object, key)) {
      map.set(Number.parseInt(key), object[key]);
    }
  }

  return map;
}
