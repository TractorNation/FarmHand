import { invoke } from "@tauri-apps/api/core";

/**
 * How a schema is represented on the wire, and how it is identified.
 *
 * A schema QR (`S`) carries `base64(zlib(minifySchema(schema)))`. Unlike a match
 * payload it is not bit-packed, because a schema's shape is exactly what a bit-packed
 * encoding would need to know in advance — general-purpose compression is the right
 * tool for repetitive JSON of unbounded shape.
 *
 * `SchemaWire.test.ts` guards the round trip, including full prop coverage.
 */

/**
 * Single-character type codes for the schema-QR wire format.
 *
 * Any type missing here falls through and ships its full name, so `multiplechoice`
 * would otherwise cost 14 characters in every schema QR code.
 */
const typeMap: { [key: string]: string } = {
  checkbox: "c",
  counter: "n",
  dropdown: "d",
  multiplechoice: "m",
  text: "t",
  number: "N",
  slider: "s",
  timer: "T",
  grid: "g",
  autopath: "a",
  filler: "f",
};

/**
 * Short keys for ComponentProps in the schema-QR wire format.
 *
 * Every prop that affects behavior or presentation must appear here — an unmapped
 * prop is silently dropped when a schema is shared. `valid` and `onChange` are
 * deliberately absent: neither is set by any schema and a function cannot be
 * serialized. SchemaWire.test.ts guards the rest.
 */
const propMap: { [key: string]: string } = {
  default: "d",
  options: "o",
  min: "m",
  max: "M",
  multiline: "l",
  selectsRange: "r",
  step: "s",
  rows: "R",
  cols: "C",
  cellLabel: "L",
  label: "T",
  pullFromTBA: "B",
  // autopath
  fieldImageKey: "I",
  gamePieces: "P",
  pathActions: "A",
  simplifyEpsilon: "E",
};

/** Props intentionally excluded from the wire format. Asserted by tests. */
export const UNSERIALIZED_PROPS = ["valid", "onChange"] as const;

/** Exposed so tests can assert full coverage of ComponentProps. */
export const SERIALIZED_PROP_KEYS = Object.keys(propMap);

const reverseTypeMap = Object.fromEntries(
  Object.entries(typeMap).map(([k, v]) => [v, k])
);
const reversePropMap = Object.fromEntries(
  Object.entries(propMap).map(([k, v]) => [v, k])
);

/**
 * Field extras carried in an optional 5th slot of each minified field array.
 *
 * Dropping these would make a schema shared by QR come out subtly different from its
 * origin — and since createSchemaHash covers the whole object, its hash would differ
 * too, so match codes from the origin device would not decode against the imported
 * copy. The optional 5th slot keeps older 4-element codes readable while making new
 * ones lossless.
 */
interface MinifiedExtras {
  i?: number; // id
  n?: string; // note
  w?: 1; // doubleWidth
  p?: 1; // persist
  /**
   * Set when the source field had no `required` key at all.
   *
   * Real schemas use both spellings — 2025Reefscape omits it, 2026Rebuilt writes
   * `"required": false` — and `JSON.stringify` distinguishes them, so the hash does
   * too. Slot 2 keeps carrying 0/1 for older readers; this flag restores the
   * absent-versus-explicitly-false difference.
   */
  r?: 1;
}

export function minifySchema(schema: Schema): any[] {
  const minifiedSections = schema.sections.map((section) => {
    const minifiedFields = section.fields.map((field) => {
      const minifiedProps: { [key: string]: any } = {};

      if (field.props) {
        for (const key in field.props) {
          if (
            propMap[key] &&
            field.props[key as keyof ComponentProps] !== undefined
          ) {
            minifiedProps[propMap[key]] =
              field.props[key as keyof ComponentProps];
          }
        }
      }

      const extras: MinifiedExtras = { i: field.id };
      if (field.note) extras.n = field.note;
      if (field.doubleWidth) extras.w = 1;
      if (field.persist) extras.p = 1;
      if (field.required === undefined) extras.r = 1;

      return [
        field.name,
        typeMap[field.type.toLowerCase()] || field.type,
        field.required ? 1 : 0,
        minifiedProps,
        extras,
      ];
    });
    return [section.title, minifiedFields];
  });

  return [schema.name, minifiedSections];
}

export function deminifySchema(minifiedSchema: any[]): Schema {
  const [name, minifiedSections] = minifiedSchema;

  const sections: SectionData[] = minifiedSections.map(
    (minifiedSection: any[], sectionIndex: number) => {
      const [title, minifiedFields] = minifiedSection;
      const fields: Component[] = minifiedFields.map(
        (minifiedField: any[], fieldIndex: number) => {
          const [fieldName, fieldTypeChar, requiredFlag, minifiedProps, extras] =
            minifiedField;

          const props: { [key: string]: any } = {};
          if (minifiedProps) {
            for (const key in minifiedProps) {
              if (reversePropMap[key]) {
                props[reversePropMap[key]] = minifiedProps[key];
              }
            }
          }

          const field: Component = {
            // Prefer the transmitted id; fall back to the historical derivation for
            // codes produced before extras existed.
            id: extras?.i ?? sectionIndex * 1000 + fieldIndex,
            name: fieldName,
            type: reverseTypeMap[fieldTypeChar] || fieldTypeChar,
            props: props,
          };

          // Omit the key entirely when the origin omitted it, so the rebuilt object
          // stringifies — and therefore hashes — identically.
          if (!extras?.r) field.required = requiredFlag === 1;

          if (extras?.n) field.note = extras.n;
          if (extras?.w) field.doubleWidth = true;
          if (extras?.p) field.persist = true;

          return field;
        }
      );

      return { title, fields };
    }
  );

  return { name, sections };
}

/**
 * A schema's identity: the first 8 hex characters of the MD5 of its JSON.
 *
 * Covers the entire object, so any edit mints a new identity — which is why saved
 * revisions are archived by hash (see SchemaUtils).
 */
export async function createSchemaHash(schema: Schema): Promise<string> {
  return await invoke<string>("hash_schema", {
    schema: JSON.stringify(schema),
  });
}

/** Compresses a minified schema for embedding in a schema QR code. */
export async function compressData(data: any): Promise<string> {
  const json = JSON.stringify(data);
  return await invoke<string>("compress_fields", { fields: json });
}

/** Inverse of {@link compressData}. Throws if the payload is corrupt. */
export async function decompressData(encoded: string): Promise<any> {
  const json = await invoke<string>("decompress_data", { data: encoded });
  return JSON.parse(json);
}
