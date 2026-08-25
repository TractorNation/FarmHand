import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { defaultSchemas, fetchSchemas } from "../utils/SchemaUtils";
import { useScoutData } from "./ScoutDataContext";
import { createSchemaHash } from "../utils/SchemaWire";

/**
 * Data that will be passed through the context
 */
interface SchemaContextType {
  schema: Schema | null;
  hash: string | null;
  schemaName: string | null;
  availableSchemas: SchemaMetaData[];
  /**
   * Schema hash → schema name, for labelling saved codes by the schema that produced
   * them. Computed once per schema list because hashing round-trips through Rust —
   * doing it per QR card would fire an invoke for every card on every render.
   */
  schemaNamesByHash: Map<string, string>;
  /** Schema name → its current hash. The inverse lookup, for labelling schemas. */
  schemaHashesByName: Map<string, string>;
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

  // Hash every available schema once per list change, so saved codes can be labelled
  // with the schema that produced them. Includes each schema's recorded origin hash,
  // since codes from another device carry that hash rather than the locally computed
  // one.
  const [schemaHashMaps, setSchemaHashMaps] = useState<{
    namesByHash: Map<string, string>;
    hashesByName: Map<string, string>;
  }>({ namesByHash: new Map(), hashesByName: new Map() });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const pairs = await Promise.all(
        availableSchemas.map(async (s) => ({
          name: s.name,
          hash: await createSchemaHash(s.schema),
          originHash: s.originHash,
        }))
      );
      if (cancelled) return;

      const namesByHash = new Map<string, string>();
      const hashesByName = new Map<string, string>();
      for (const { name, hash, originHash } of pairs) {
        namesByHash.set(hash, name);
        if (originHash) namesByHash.set(originHash, name);
        // The locally computed hash is the schema's current identity, so it is the
        // one to show against the schema itself.
        hashesByName.set(name, hash);
      }
      setSchemaHashMaps({ namesByHash, hashesByName });
    })().catch((e) => console.error("Failed to map schema hashes", e));

    return () => {
      cancelled = true;
    };
  }, [availableSchemas]);

  const value = useMemo(
    () => ({
      schema: activeSchema,
      hash: schemaHash,
      schemaName: schema ?? null,
      availableSchemas,
      schemaNamesByHash: schemaHashMaps.namesByHash,
      schemaHashesByName: schemaHashMaps.hashesByName,
      loadSchemas,
      refreshSchemas: loadSchemas,
    }),
    [
      activeSchema,
      schemaHash,
      schema,
      availableSchemas,
      schemaHashMaps,
      loadSchemas,
    ]
  );

  return (
    <SchemaContext.Provider value={value}>{children}</SchemaContext.Provider>
  );
}

export function useSchema() {
  const context = useContext(SchemaContext);
  if (!context)
    throw new Error("useSchemaContext must be used within a SchemaProvider");
  return context;
}
