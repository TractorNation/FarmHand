import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useState,
  useRef,
  useEffect,
} from "react";
import StoreManager, { StoreKeys } from "../utils/StoreManager";

interface ScoutDataContextType {
  matchData: Map<number, any>;
  addMatchData: (key: number, val: any) => void;
  getMatchData: (key: number) => any;
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
  const [matchData, setMatchData] = useState<Map<number, any>>(
    new Map<number, any>()
  );
  const [errors, setErrors] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const matchDataRef = useRef(matchData);

  useEffect(() => {
    matchDataRef.current = matchData;
  }, [matchData]);

  const { children } = props;

  const addMatchData = useCallback(async (key: number, val: any) => {
    setMatchData((prevMap) => {
      const newMap = new Map(prevMap);
      newMap.set(key, val);
      return newMap;
    });

    await StoreManager.set(StoreKeys.match.field(key.toString()), val);
  }, []);

  const getMatchData = useCallback(
    async (key: number) => {
      const safeKey = StoreKeys.match.field(key.toString());

      const cachedValue = matchDataRef.current.get(key);
      if (cachedValue !== undefined && cachedValue !== null) {
        return cachedValue;
      }

      const storedValue = await StoreManager.get(safeKey);

      if (storedValue !== undefined && storedValue !== null) {
        setMatchData((prevMap) => {
          if (prevMap.get(key) === storedValue) return prevMap;
          const newMap = new Map(prevMap);
          newMap.set(key, storedValue);
          return newMap;
        });
        return storedValue;
      }

      return undefined;
    },
    [setMatchData]
  );

  const clearMatchData = async () => {
    const storeToDelete = Array.from(matchData.keys());

    setMatchData(new Map<number, any>());
    setSubmitted(false);

    await Promise.all(storeToDelete.map((key) => StoreManager.remove(key.toString())));
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
