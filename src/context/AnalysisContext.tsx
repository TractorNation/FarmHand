import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useState,
  useEffect,
} from "react";
import StoreManager from "../utils/StoreManager";

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
    const saved = await StoreManager.get("analyses");
    if (saved) {
      setAnalyses(JSON.parse(saved));
    }
  }, []);

  const saveAnalysis = useCallback(async (analysis: Analysis) => {
    setAnalyses((prev) => {
      const existing = prev.findIndex((a) => a.id === analysis.id);
      const updated =
        existing >= 0
          ? prev.map((a) => (a.id === analysis.id ? analysis : a))
          : [...prev, analysis];

      StoreManager.set("analyses", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const deleteAnalysis = useCallback(async (id: number) => {
    setAnalyses((prev) => {
      const updated = prev.filter((a) => a.id !== id);
      StoreManager.set("analyses", JSON.stringify(updated));
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
