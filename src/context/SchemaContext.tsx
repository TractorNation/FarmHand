import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import StoreManager from "../utils/StoreManager";

import testSchema from "../config/schema/test.json";
import { createSchemaHash } from "../utils/GeneralUtils";

/**
 * Interface to store data about a single Schema
 */
interface SchemaMetaData {
  name: string;
  path: string;
  schema: Schema;
}

/**
 * Data that will be passed through the context
 */
interface SchemaContextType {
  schema: Schema | null;
  hash: string | null;
  schemaName: string | null;
  availableSchemas: SchemaMetaData[];
  loadSchemas: () => Promise<SchemaMetaData[]>;
  selectSchema: (name: string) => Promise<void>;
  refreshSchemas: () => Promise<void>;
}

const SchemaContext = createContext<SchemaContextType | null>(null);

export default function SchemaProvider({ children }: { children: ReactNode }) {
  const [schema, setSchema] = useState<Schema | null>(null);
  const [schemaName, setSchemaName] = useState<string | null>(null);
  const [schemaHash, setSchemaHash] = useState<string | null>(null);
  const availableSchemas = useRef<SchemaMetaData[] | null>(null);

  const initializedRef = useRef(false);

  const loadSchemas = useCallback(async () => {
    const defaults: SchemaMetaData[] = [
      {
        name: "Test Schema",
        path: "../config/schema/test.json",
        schema: testSchema as Schema,
      },
    ];

    availableSchemas.current = defaults;
    return defaults;
  }, []);

  const selectSchema = useCallback(
    async (name: string) => {
      const found =
        availableSchemas.current!.find((s) => s.name === name) ?? null;

      if (found === null || found === undefined) {
        console.warn(`Schema: "${name}" not found`);
        return;
      }

      setSchema(found.schema);
      setSchemaName(found.name);

      const hash = await createSchemaHash(found.schema);
      setSchemaHash(hash)
      console.log("Setting schema hash", hash);
      await StoreManager.setLastSchema(found.name);
    },
    [availableSchemas]
  );

  const refreshSchemas = async () => {
    await loadSchemas();
  };

  useEffect(() => {
    // Only run initialization once
    if (initializedRef.current) return;
    initializedRef.current = true;

    const init = async () => {
      try {
        // Load schemas first
        const schemas = await loadSchemas();

        // Then try to get the last saved schema
        const lastSchema = await StoreManager.getLastSchema();

        // If there's a last schema
        if (lastSchema && schemas.find((s) => s.name === lastSchema)) {
          selectSchema(lastSchema);
        } else if (schemas.length > 0) {
          // Otherwise, default to first schema
          selectSchema(schemas[0].name);
        }
      } catch (error) {
        console.error("Error initializing schema:", error);
        // Still set a default if something fails
        const schemas = await loadSchemas();
        if (schemas.length > 0) {
          setSchema(schemas[0].schema);
          setSchemaName(schemas[0].name);
        }
      }
    };

    init();
  }, [loadSchemas]);

  return (
    <SchemaContext.Provider
      value={{
        schema: schema,
        hash: schemaHash,
        schemaName: schemaName,
        availableSchemas: availableSchemas.current!,
        loadSchemas,
        selectSchema,
        refreshSchemas,
      }}
    >
      {children}
    </SchemaContext.Provider>
  );
}

export function useSchema() {
  const context = useContext(SchemaContext);
  if (!context)
    throw new Error("useSchemaContext must be used within a SchemaProvider");
  return context;
}
