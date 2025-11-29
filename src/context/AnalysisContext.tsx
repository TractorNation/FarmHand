import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useState,
  useEffect,
} from "react";
import StoreManager, { StoreKeys } from "../utils/StoreManager";

interface AnalysisContextType {
  analyses: Analysis[];
  loadAnalyses: () => Promise<void>;
  saveAnalysis: (analysis: Analysis) => Promise<void>;
  deleteAnalysis: (id: number) => Promise<void>;
}

const AnalysisContext = createContext<AnalysisContextType | null>(null);

export default function AnalysisProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);

  const loadAnalyses = useCallback(async () => {
    try {
      // Get list of analysis IDs
      const idsList = await StoreManager.get(StoreKeys.analysis.list);
      if (!idsList) {
        // Backwards compatibility: check for old format
        const oldData = await StoreManager.get("analyses");
        if (oldData) {
          const oldAnalyses: Analysis[] = JSON.parse(oldData);
          // Migrate old format to new format
          const migratedIds: number[] = [];
          for (const analysis of oldAnalyses) {
            await StoreManager.set(
              StoreKeys.analysis.byId(analysis.id),
              JSON.stringify(analysis)
            );
            migratedIds.push(analysis.id);
          }
          await StoreManager.set(
            StoreKeys.analysis.list,
            JSON.stringify(migratedIds)
          );
          // Remove old key
          await StoreManager.remove("analyses");
          setAnalyses(oldAnalyses);
          return;
        }
        setAnalyses([]);
        return;
      }

      const ids: number[] = JSON.parse(idsList);
      if (ids.length === 0) {
        setAnalyses([]);
        return;
      }

      // Load each analysis individually
      const analysisPromises = ids.map(async (id) => {
        const analysisData = await StoreManager.get(StoreKeys.analysis.byId(id));
        if (analysisData) {
          return JSON.parse(analysisData) as Analysis;
        }
        return null;
      });

      const loadedAnalyses = await Promise.all(analysisPromises);
      const validAnalyses = loadedAnalyses.filter(
        (a): a is Analysis => a !== null
      );
      setAnalyses(validAnalyses);
    } catch (error) {
      console.error("Failed to load analyses:", error);
      setAnalyses([]);
    }
  }, []);

  const saveAnalysis = useCallback(async (analysis: Analysis) => {
    // Save individual analysis
    await StoreManager.set(
      StoreKeys.analysis.byId(analysis.id),
      JSON.stringify(analysis)
    );

    // Update the list of analysis IDs
    setAnalyses((prev) => {
      const existing = prev.findIndex((a) => a.id === analysis.id);
      const updated =
        existing >= 0
          ? prev.map((a) => (a.id === analysis.id ? analysis : a))
          : [...prev, analysis];

      // Save updated ID list
      const ids = updated.map((a) => a.id);
      StoreManager.set(StoreKeys.analysis.list, JSON.stringify(ids));

      return updated;
    });
  }, []);

  const deleteAnalysis = useCallback(async (id: number) => {
    // Remove individual analysis
    await StoreManager.remove(StoreKeys.analysis.byId(id));

    // Update the list of analysis IDs
    setAnalyses((prev) => {
      const updated = prev.filter((a) => a.id !== id);
      const ids = updated.map((a) => a.id);
      StoreManager.set(StoreKeys.analysis.list, JSON.stringify(ids));
      return updated;
    });
  }, []);

  useEffect(() => {
    loadAnalyses();
  }, [loadAnalyses]);

  return (
    <AnalysisContext.Provider
      value={{ analyses, loadAnalyses, saveAnalysis, deleteAnalysis }}
    >
      {children}
    </AnalysisContext.Provider>
  );
}

export function useAnalysis() {
  const context = useContext(AnalysisContext);
  if (!context)
    throw new Error("useAnalysis must be used within AnalysisProvider");
  return context;
}
