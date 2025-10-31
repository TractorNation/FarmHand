import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import StoreManager from "../Utils/StoreManager";

import testSchema from "../config/schema/test.json";

/**
 * Interface to store data about a single Schema
 */
interface SchemaMetaData {
  name: string;
  path: string;
  schema: any;
}

/**
 * Data that will be passed through the context
 */
interface SchemaContextType {
  schema: any | null;
  schemaName: string | null;
  availableSchemas: SchemaMetaData[];
  loadSchemas: () => Promise<SchemaMetaData[]>;
  selectSchema: (name: string) => Promise<void>;
  refreshSchemas: () => Promise<void>;
}

export const SchemaContext = createContext<SchemaContextType | null>(null);

export default function SchemaProvider({ children }: { children: ReactNode }) {
  const [schema, setSchema] = useState<any | null>(null);
  const [schemaName, setSchemaName] = useState<string | null>(null);
  const [availableSchemas, setAvailableSchemas] = useState<SchemaMetaData[]>([]);
  const initializedRef = useRef(false);

  const loadSchemas = useCallback(async () => {
    const defaults: SchemaMetaData[] = [
      {
        name: "Test Schema",
        path: "../config/schema/test.json",
        schema: testSchema,
      },
    ];

    setAvailableSchemas(defaults);
    return defaults;
  }, []);

  const selectSchema = useCallback(
    async (name: string) => {
      const found = availableSchemas.find((s) => s.name === name);
      if (!found) {
        console.warn(`Schema "${name}" not found`);
        return;
      }

      console.log("Selected schema:", found);

      setSchema(found.schema);
      setSchemaName(found.name);

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
        
        if (lastSchema && schemas.find(s => s.name === lastSchema)) {
          // If we have a valid saved schema, select it
          setSchema(schemas.find(s => s.name === lastSchema)!.schema);
          setSchemaName(lastSchema);
        } else if (schemas.length > 0) {
          // Otherwise, default to first schema
          setSchema(schemas[0].schema);
          setSchemaName(schemas[0].name);
          await StoreManager.setLastSchema(schemas[0].name);
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
        schemaName: schemaName,
        availableSchemas,
        loadSchemas,
        selectSchema,
        refreshSchemas,
      }}
    >
      {children}
    </SchemaContext.Provider>
  );
}