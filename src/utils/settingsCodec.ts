/**
 * Settings are persisted as strings.
 *
 * `StoreManager.set` takes a string, and `SettingsContext.setSetting` writes
 * `String(value)`, so every setting round-trips through text and has to be coerced
 * back on read. The type of the *default* is what decides how — there is no schema.
 */

/**
 * Reads one stored setting back to the type its default implies.
 *
 * - **Boolean defaults**: only the exact string `"true"` is true. Anything else —
 *   `"TRUE"`, `"1"`, `"yes"`, a stray value — reads as **false**. Quiet and
 *   surprising, but it matches what `String(true)` writes, so a value this app wrote
 *   always round-trips.
 * - **Number defaults**: `parseInt`, falling back to the default when unparseable, so
 *   a corrupt value cannot put `NaN` into a device id or a device count.
 * - **Everything else**: passed through as the stored string.
 *
 * An absent value (`null`/`undefined`) yields the default; the caller is responsible
 * for writing it back.
 */
export function coerceSetting<T>(
  storedValue: string | null | undefined,
  defaultValue: T
): T {
  if (storedValue === null || storedValue === undefined) {
    return defaultValue;
  }

  if (typeof defaultValue === "boolean") {
    return (storedValue === "true") as T;
  }

  if (typeof defaultValue === "number") {
    const num = parseInt(storedValue, 10);
    return (isNaN(num) ? defaultValue : num) as T;
  }

  return storedValue as T;
}
