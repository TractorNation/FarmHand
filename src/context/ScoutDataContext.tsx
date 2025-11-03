import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useState,
} from "react";
import StoreManager from "../Utils/StoreManager";

interface ScoutDataContextType {
  matchData: Map<string, any>;
  addMatchData: (key: string, val: any) => void;
  getMatchData: (key: string) => any;
  clearMatchData: () => Promise<void>;
  errors: string[];
  addError: (error: string) => void;
  removeError: (error: string) => void;
  clearErrors: () => void;
  submitted: boolean;
  setSubmitted: (submitted: boolean) => void;
}

interface ScoutDataProviderProps {
  children: ReactNode;
}

export const ScoutDataContext = createContext<ScoutDataContextType | null>(
  null
);

export default function ScoutDataProvider(props: ScoutDataProviderProps) {
  const [matchData, setMatchData] = useState<Map<string, any>>(
    new Map<string, any>()
  );
  const [errors, setErrors] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const { children } = props;

  const addMatchData = useCallback(async (key: string, val: any) => {
    setMatchData((prevMap) => {
      const newMap = new Map(prevMap);
      newMap.set(key, val);
      return newMap;
    });

    await StoreManager.set(key, val);
  }, []);

  const getMatchData = useCallback(
    async (key: string) => {
      return matchData.get(key) ?? (await StoreManager.get(key));
    },
    [matchData]
  );

  const clearMatchData = async () => {
    const storeToDelete = Array.from(matchData.keys());

    setMatchData(new Map<string, any>());
    setSubmitted(false);

    await Promise.all(storeToDelete.map((key) => StoreManager.remove(key)));
  };

  const addError = useCallback((error: string) => {
    setErrors((prev) => [...prev, error]);
  }, []);

  const removeError = useCallback((error: string) => {
    setErrors((prevErrors) => prevErrors.filter((e) => e !== error));
  }, []);

  const clearErrors = () => {
    setErrors([]);
  };

  return (
    <ScoutDataContext.Provider
      value={{
        matchData,
        addMatchData,
        getMatchData,
        clearMatchData,
        errors,
        addError,
        removeError,
        clearErrors,
        submitted,
        setSubmitted,
      }}
    >
      {children}
    </ScoutDataContext.Provider>
  );
}

export function useScoutData() {
  const context = useContext(ScoutDataContext);
  if (!context)
    throw new Error("useScoutData must be used within a ScoutDataProvider");
  return context;
}
