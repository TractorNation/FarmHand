import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useState,
  useEffect,
} from "react";
import {
  fetchAnalyses,
  saveAnalysis as saveAnalysisFile,
  deleteAnalysis as deleteAnalysisFile,
} from "../utils/AnalysisUtils";
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
      // First, try to migrate any analyses from the store to files
      const idsList = await StoreManager.get(StoreKeys.analysis.list);
      if (idsList) {
        const ids: number[] = JSON.parse(idsList);

        // Migrate each analysis from store to file
        for (const id of ids) {
          try {
            const analysisData = await StoreManager.get(
              StoreKeys.analysis.byId(id)
            );
            if (analysisData) {
              const analysis: Analysis = JSON.parse(analysisData);
              // Save to file
              await saveAnalysisFile(analysis);
              // Remove from store
              await StoreManager.remove(StoreKeys.analysis.byId(id));
            }
          } catch (error) {
            console.error(`Failed to migrate analysis ${id}:`, error);
          }
        }

        // Remove the list from store after migration
        await StoreManager.remove(StoreKeys.analysis.list);
      }

      // Check for old format (single "analyses" key)
      const oldData = await StoreManager.get("analyses");
      if (oldData) {
        try {
          const oldAnalyses: Analysis[] = JSON.parse(oldData);
          // Migrate each to file
          for (const analysis of oldAnalyses) {
            await saveAnalysisFile(analysis);
          }
          // Remove old key
          await StoreManager.remove("analyses");
        } catch (error) {
          console.error("Failed to migrate old analyses format:", error);
        }
      }

      // Load analyses from files
      const loadedAnalyses = await fetchAnalyses();
      setAnalyses(loadedAnalyses);
    } catch (error) {
      console.error("Failed to load analyses:", error);
      setAnalyses([]);
    }
  }, []);

  const saveAnalysis = useCallback(async (analysis: Analysis) => {
    // Save analysis to file
    await saveAnalysisFile(analysis);

    // Update local state
    setAnalyses((prev) => {
      const existing = prev.findIndex((a) => a.id === analysis.id);
      return existing >= 0
        ? prev.map((a) => (a.id === analysis.id ? analysis : a))
        : [...prev, analysis];
    });
  }, []);

  const deleteAnalysis = useCallback(async (id: number) => {
    // Delete analysis file
    await deleteAnalysisFile(id);

    // Update local state
    setAnalyses((prev) => prev.filter((a) => a.id !== id));
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
