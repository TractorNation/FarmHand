import {
  BaseDirectory,
  exists,
  mkdir,
  readDir,
  readTextFile,
} from "@tauri-apps/plugin-fs";
import { createSchemaHash } from "./SchemaWire";
import { appLocalDataDir, resolve } from "@tauri-apps/api/path";
import Reefscape from "../config/schema/2025Reefscape.json";
import Decode from "../config/schema/2025Decode.json";
import Pits from "../config/schema/2026PitScouting.json";
import TBAPits from "../config/schema/2026PitScoutingTBA.json";
import Rebuilt from "../config/schema/2026Rebuilt.json";
import TBARebuilt from "../config/schema/2026RebuiltTBA.json";
import { invoke } from "@tauri-apps/api/core";
import StoreManager, { StoreKeys } from "./StoreManager";

export const defaultSchemas: SchemaMetaData[] = [
  {
    name: "2025 Decode",
    path: "../config/schema/2025Decode.json",
    schema: Decode as Schema,
    type: "default",
  },
  {
    name: "2025 Reefscape",
    path: "../config/schema/2025Reefscape.json",
    schema: Reefscape as Schema,
    type: "default",
  },
  {
    name: "2026 Pit Scouting",
    path: "../config/schema/2026PitScouting.json",
    schema: Pits as Schema,
    type: "default",
  },
  {
    name: "2026 Pit Scouting (TBA)",
    path: "../config/schema/2026PitScoutingTBA.json",
    schema: TBAPits as Schema,
    type: "default",
  },
   {
    name: "2026 Rebuilt",
    path: "../config/schema/2026Rebuilt.json",
    schema: Rebuilt as Schema,
    type: "default",
  },
   {
    name: "2026 Rebuilt (TBA)",
    path: "../config/schema/2026RebuiltTBA.json",
    schema: TBARebuilt as Schema,
    type: "default",
  }
];

/** Where superseded schema revisions are kept, relative to AppLocalData. */
const REVISIONS_DIR = "schemas/revisions";

/**
 * Finds the schema a QR code was recorded against.
 *
 * Three lookups, in order:
 *
 * 1. **Recorded origin hash.** A schema imported by QR is functionally identical to
 *    its source but not byte-identical — minifySchema normalizes key order and
 *    optional booleans — so its local hash differs from the one the sending device
 *    stamped into its match codes.
 * 2. **Locally computed hash** of each available schema.
 * 3. **The revision archive.** The hash covers the whole schema object, so any edit
 *    mints a new identity and strands codes recorded under the old one. The archive
 *    returns the *exact* revision that produced the hash — decoding a bit-packed payload
 *    against a structurally different schema yields silent garbage, so resolving an
 *    old hash onto the current schema would be worse than failing.
 */
export async function getSchemaFromHash(
  hash: string,
  availableSchemas: SchemaMetaData[]
): Promise<Schema | null> {
  const byOrigin = availableSchemas.find((s) => s.originHash === hash);
  if (byOrigin) return byOrigin.schema;

  const allSchemasWithHash = await Promise.all(
    availableSchemas.map(async (s) => ({
      schema: s.schema,
      hash: await createSchemaHash(s.schema),
    }))
  );

  const found = allSchemasWithHash.find((s) => s.hash === hash);
  if (found) return found.schema;

  return await getArchivedSchema(hash);
}

/** Reads a saved schema by name, or null when it does not exist yet / is unreadable. */
async function readSchemaFile(name: string): Promise<Schema | null> {
  try {
    const path = `schemas/${name}.json`;
    const present = await exists(path, { baseDir: BaseDirectory.AppLocalData });
    if (!present) return null;

    const contents = await readTextFile(path, {
      baseDir: BaseDirectory.AppLocalData,
    });
    return JSON.parse(contents) as Schema;
  } catch {
    return null;
  }
}

/** Reads a superseded schema revision by its hash, or null if it was never archived. */
export async function getArchivedSchema(hash: string): Promise<Schema | null> {
  try {
    const path = `${REVISIONS_DIR}/${hash}.json`;
    const present = await exists(path, { baseDir: BaseDirectory.AppLocalData });
    if (!present) return null;

    const contents = await readTextFile(path, {
      baseDir: BaseDirectory.AppLocalData,
    });
    return JSON.parse(contents) as Schema;
  } catch (e) {
    console.error(`Failed to read archived schema ${hash}`, e);
    return null;
  }
}

/**
 * Archives a schema under its own hash before it is overwritten.
 *
 * Cheap insurance: schemas are a few KB, and this is the only thing that keeps
 * already-recorded match codes readable across an edit or a rename (which deletes
 * the original file outright). Never overwrites an existing revision — identical
 * hash means identical content.
 */
async function archiveSchemaRevision(schema: Schema): Promise<void> {
  try {
    const hash = await createSchemaHash(schema);

    await mkdir(REVISIONS_DIR, {
      baseDir: BaseDirectory.AppLocalData,
      recursive: true,
    });

    const relativePath = `${REVISIONS_DIR}/${hash}.json`;
    if (await exists(relativePath, { baseDir: BaseDirectory.AppLocalData })) {
      return;
    }

    const filePath = await resolve(
      await appLocalDataDir(),
      REVISIONS_DIR,
      `${hash}.json`
    );
    await invoke("save_schema", {
      schema: JSON.stringify(schema),
      filePath,
    });
  } catch (e) {
    // Archiving is a safety net, not the operation the user asked for — a failure
    // here must not block saving the schema itself.
    console.error("Failed to archive schema revision", e);
  }
}

export async function fetchSchemas(): Promise<SchemaMetaData[]> {
  const folderExists = await exists("schemas", {
    baseDir: BaseDirectory.AppLocalData,
  });
  if (!folderExists) {
    console.log("Failed to fetch schemas, folder does not exist");
    return [];
  }

  const files = await readDir("schemas", {
    baseDir: BaseDirectory.AppLocalData,
  });

  const schemas = files.filter((f) => f.name.endsWith(".json"));

  const results = await Promise.all(
    schemas.map(async (file) => {
      const contents = await readTextFile(`schemas/${file.name}`, {
        baseDir: BaseDirectory.AppLocalData,
      });

      const object = JSON.parse(contents) as Schema;
      const originHash = await StoreManager.get(
        StoreKeys.schema.originHash(object.name)
      );
      return {
        name: object.name,
        path: `schemas/${file.name}`,
        schema: object,
        type: "generated",
        originHash: originHash ?? undefined,
      } as SchemaMetaData;
    })
  );

  return results;
}

/**
 * Persists a schema.
 *
 * @param originHash pass when importing from a QR code: it is the hash the sending
 *   device stamps into its match codes, and it must be recorded for those codes to
 *   resolve here. Omit for schemas authored locally.
 */
export async function saveSchema(schema: Schema, originHash?: string) {
  await mkdir("schemas", {
    baseDir: BaseDirectory.AppLocalData,
    recursive: true,
  });

  // Archive the revision being replaced before it is overwritten. This is what keeps
  // codes already recorded against the outgoing version readable, and it is the only
  // chance to capture schemas that predate the archive.
  const existing = await readSchemaFile(schema.name);
  if (existing) await archiveSchemaRevision(existing);

  // Archive the incoming revision too, so a later rename (which deletes the original
  // file) or delete still leaves its codes decodable.
  await archiveSchemaRevision(schema);

  const filePath = await resolve(
    await appLocalDataDir(),
    "schemas",
    `${schema.name}.json`
  );

  const schemaToSave = JSON.stringify(schema);

  await invoke("save_schema", {
    schema: schemaToSave,
    filePath,
  });

  if (originHash) {
    await StoreManager.set(StoreKeys.schema.originHash(schema.name), originHash);
  }
}

export async function deleteSchema(schemaMeta: SchemaMetaData) {
  const filePath = await resolve(await appLocalDataDir(), schemaMeta.path);

  await invoke("delete_schema", { path: filePath });
}
