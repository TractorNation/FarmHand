import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { defaultSchemas, fetchSchemas } from "../utils/SchemaUtils";
import { useScoutData } from "./ScoutDataContext";
import { createSchemaHash } from "../utils/GeneralUtils";

/**
 * Data that will be passed through the context
 */
interface SchemaContextType {
  schema: Schema | null;
  hash: string | null;
  schemaName: string | null;
  availableSchemas: SchemaMetaData[];
  loadSchemas: () => Promise<SchemaMetaData[]>;
  refreshSchemas: () => Promise<SchemaMetaData[]>;
}

const SchemaContext = createContext<SchemaContextType | null>(null);

interface SchemaProviderProps {
  children: ReactNode;
  schema?: string;
}

export default function SchemaProvider(props: SchemaProviderProps) {
  const { children, schema } = props;
  const [activeSchema, setActiveSchema] = useState<Schema | null>(null);
  const [schemaHash, setSchemaHash] = useState<string | null>(null);
  const { clearMatchData } = useScoutData();
  const [availableSchemas, setAvailableSchemas] = useState<SchemaMetaData[]>(
    []
  );
  const isInitialMount = useRef(true);

  const loadSchemas = useCallback(async () => {
    try {
      const generatedSchemas = await fetchSchemas();
      const allSchemas = [...defaultSchemas, ...generatedSchemas];
      setAvailableSchemas(allSchemas);
      return allSchemas;
    } catch (error) {
      console.error("Failed to load schemas:", error);
      setAvailableSchemas(defaultSchemas); // Fallback to default schemas
      return defaultSchemas;
    }
  }, []);

  // Effect to load schemas on mount
  useEffect(() => {
    loadSchemas();
  }, []);

  // Effect to clear match data when the schema changes
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    clearMatchData();
  }, [schema, clearMatchData]);

  // Effect to update the active schema when the name changes or schemas are loaded
  useEffect(() => {
    const setSchemaData = async (name: string | null) => {
      if (!name) {
        setActiveSchema(null);
        setSchemaHash(null);
        return;
      }
      if (availableSchemas.length === 0) {
        return;
      }

      const found = availableSchemas.find((s) => s.name === name) ?? null;

      if (found === null || found === undefined) {
        console.warn(`Schema: "${name}" not found`);
        // Just log the warning, don't try to change it
        return;
      }

      setActiveSchema(found.schema);
      const hash = await createSchemaHash(found.schema);
      setSchemaHash(hash);
    };

    setSchemaData(schema!);
  }, [schema, availableSchemas])

  return (
    <SchemaContext.Provider
      value={{
        schema: activeSchema,
        hash: schemaHash,
        schemaName: schema ?? null,
        availableSchemas: availableSchemas,
        loadSchemas,
        refreshSchemas: loadSchemas,
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
