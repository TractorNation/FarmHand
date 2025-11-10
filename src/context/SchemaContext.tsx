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
import { defaultSchemas } from "../utils/DefaultSchemas";
import { createSchemaHash } from "../utils/GeneralUtils";
import { useScoutData } from "./ScoutDataContext";

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

interface SchemaProviderProps {
  children: ReactNode;
  schema?: string;
  onSchemaChange?: (name: string) => void;
}

export default function SchemaProvider({
  children,
  schema,
  onSchemaChange,
}: SchemaProviderProps) {
  const [activeSchema, setActiveSchema] = useState<Schema | null>(null);
  const [schemaHash, setSchemaHash] = useState<string | null>(null);
  const [internalSchemaName, setInternalSchemaName] = useState<string | null>(
    null
  );
  const { clearMatchData } = useScoutData();
  const isInitialMount = useRef(true);
  const availableSchemas = useRef<SchemaMetaData[]>([]);

  const isControlled = schema !== undefined;
  const schemaName = isControlled ? schema : internalSchemaName;

  const loadSchemas = useCallback(async () => {
    availableSchemas.current = defaultSchemas;
    return defaultSchemas;
  }, []);

  useEffect(() => {
    const setSchemaData = async (name: string | null) => {
      if (isInitialMount.current) {
        isInitialMount.current = false;
      } else {
        await clearMatchData();
      }

      if (!name) {
        setActiveSchema(null);
        setSchemaHash(null);
        return;
      }
      if (availableSchemas.current.length === 0) {
        await loadSchemas();
      }

      const found =
        availableSchemas.current.find((s) => s.name === name) ?? null;

      if (found === null || found === undefined) {
        console.warn(`Schema: "${name}" not found`);
        return;
      }

      setActiveSchema(found.schema);

      const hash = await createSchemaHash(found.schema);
      setSchemaHash(hash);
      await StoreManager.setLastSchema(found.name);
    };

    setSchemaData(schemaName);
  }, [schemaName, loadSchemas, clearMatchData]);

  const selectSchema = useCallback(
    async (name: string) => {
      if (isControlled) {
        onSchemaChange?.(name);
      } else {
        setInternalSchemaName(name);
      }
    },
    [isControlled, onSchemaChange]
  );

  const refreshSchemas = async () => {
    await loadSchemas();
  };

  useEffect(() => {
    if (isControlled) return;

    const init = async () => {
      try {
        const schemas = await loadSchemas();
        const lastSchema = await StoreManager.getLastSchema();

        if (lastSchema && schemas.find((s) => s.name === lastSchema)) {
          setInternalSchemaName(lastSchema);
        } else if (schemas.length > 0) {
          setInternalSchemaName(schemas[1].name);
        }
      } catch (error) {
        console.error("Error initializing schema:", error);
      }
    };

    init();
  }, [isControlled, loadSchemas]);

  return (
    <SchemaContext.Provider
      value={{
        schema: activeSchema,
        hash: schemaHash,
        schemaName: schemaName,
        availableSchemas: availableSchemas.current,
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
