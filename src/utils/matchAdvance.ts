/**
 * What survives clearing the scouting form between matches.
 *
 * Getting it wrong does not fail loudly — it files a match under the wrong number,
 * and the data is only discovered to be misattributed long after the event.
 */

export interface PersistedEntry {
  key: number;
  value: any;
}

/**
 * The next value for Match Number after completing a match.
 *
 * Three regimes:
 * - **TBA schedule loaded** and the current value is in it → the next scheduled
 *   match, so labels like `Qual-9 → Semis-1` follow the real event order.
 * - **Last match of the schedule** → hold, rather than running off the end.
 * - **No schedule, or a value not in it** → numeric `+1`, clamped to the field's max.
 *   A non-numeric value with no schedule holds, since there is nothing to increment.
 *
 * The empty-schedule case needs the explicit `hasSchedule` guard: `indexOf` returns
 * -1 and `allMatchNumbers.length - 1` is also -1 when the list is empty, so without
 * it the "last match" branch would catch every non-TBA scout and hold forever.
 */
export function nextMatchNumber(
  current: string | number,
  allMatchNumbers: string[],
  max?: number | null
): string | number {
  const currentStr = String(current);
  const index = allMatchNumbers.indexOf(currentStr);
  const hasSchedule = allMatchNumbers.length > 0;

  if (hasSchedule && index !== -1) {
    return index < allMatchNumbers.length - 1
      ? allMatchNumbers[index + 1]
      : current; // last scheduled match — hold
  }

  // Falls through for "no schedule at all" and "value not on the schedule".
  // A label like "Qual-12" increments its trailing number.
  const numericPart = parseInt(currentStr.split("-").pop() || "", 10);
  if (isNaN(numericPart)) return current;

  const next = numericPart + 1;
  return max != null && next > max ? max : next;
}

/**
 * Collects the entries that should be written back after a form clear.
 *
 * `persist: true` fields keep their value (device id, alliance, scouter name); Match
 * Number advances when `incrementMatchNumber` is set. Null and undefined are skipped
 * so a cleared field stays cleared rather than being restored as an explicit null.
 */
export function buildPersistedEntries({
  fields,
  matchData,
  allMatchNumbers,
  incrementMatchNumber,
}: {
  fields: Component[];
  matchData: Map<number, any>;
  allMatchNumbers: string[];
  incrementMatchNumber: boolean;
}): PersistedEntry[] {
  const entries: PersistedEntry[] = [];

  for (const field of fields) {
    if (field.name === "Match Number" && incrementMatchNumber) {
      const current = matchData.get(field.id);
      if (current === undefined || current === null) continue;

      entries.push({
        key: field.id,
        value: nextMatchNumber(current, allMatchNumbers, field.props?.max),
      });
    } else if (field.persist) {
      const value = matchData.get(field.id);
      if (value === undefined || value === null) continue;

      entries.push({ key: field.id, value });
    }
  }

  return entries;
}
