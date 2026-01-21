import {
  BaseDirectory,
  exists,
  mkdir,
  readDir,
  readTextFile,
} from "@tauri-apps/plugin-fs";
import { createSchemaHash } from "./GeneralUtils";
import { appLocalDataDir, resolve } from "@tauri-apps/api/path";
import Reefscape from "../config/schema/2025Reefscape.json";
import Decode from "../config/schema/2025Decode.json";
import Pits from "../config/schema/2026PitScouting.json";
import Rebuilt from "../config/schema/2026Rebuilt.json";
import { invoke } from "@tauri-apps/api/core";

export const defaultSchemas: SchemaMetaData[] = [
  // {
  //   name: "2025 Decode",
  //   path: "../config/schema/2025Decode.json",
  //   schema: Decode as Schema,
  //   type: "default",
  // },
  // {
  //   name: "2025 Reefscape",
  //   path: "../config/schema/2025Reefscape.json",
  //   schema: Reefscape as Schema,
  //   type: "default",
  // },
  {
    name: "2026 Pit Scouting",
    path: "../config/schema/2026PitScouting.json",
    schema: Pits as Schema,
    type: "default",
  },
   {
    name: "2026 Rebuilt",
    path: "../config/schema/2026Rebuilt.json",
    schema: Rebuilt as Schema,
    type: "default",
  }
];

export async function getSchemaFromHash(
  hash: string,
  availableSchemas: SchemaMetaData[]
): Promise<Schema | null> {
  const allSchemasWithHash = await Promise.all(
    availableSchemas.map(async (s) => ({
      schema: s.schema,
      hash: await createSchemaHash(s.schema),
    }))
  );

  const found = allSchemasWithHash.find((s) => s.hash === hash);
  return found ? found.schema : null;
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
      return {
        name: object.name,
        path: `schemas/${file.name}`,
        schema: object,
        type: "generated",
      } as SchemaMetaData;
    })
  );

  return results;
}

export async function saveSchema(schema: Schema) {
  await mkdir("schemas", {
    baseDir: BaseDirectory.AppLocalData,
    recursive: true,
  });

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
}

export async function deleteSchema(schemaMeta: SchemaMetaData) {
  const filePath = await resolve(await appLocalDataDir(), schemaMeta.path);

  await invoke("delete_schema", { path: filePath });
}
