import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useState,
  useRef,
} from "react";
import StoreManager, { StoreKeys } from "../utils/StoreManager";

interface ScoutDataContextType {
  getMatchDataMap: () => Map<number, any>;
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
  const matchData = useRef<Map<number, any>>(new Map());

  const [errors, setErrors] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const { children } = props;

  const addMatchData = useCallback(async (key: number, val: any) => {
    matchData.current.set(key, val);

    await StoreManager.set(StoreKeys.match.field(key.toString()), val);
  }, []);

  const getMatchData = useCallback(async (key: number) => {
    const safeKey = StoreKeys.match.field(key.toString());

    const cachedValue = matchData.current.get(key);
    if (cachedValue !== undefined && cachedValue !== null) {
      return cachedValue;
    }

    const storedValue = await StoreManager.get(safeKey);

    if (storedValue !== undefined && storedValue !== null) {
      matchData.current.set(key, storedValue);

      return storedValue;
    }

    return undefined;
  }, []);

  const getMatchDataMap = useCallback(() => matchData.current, []);

  const clearMatchData = async () => {
    const storeToDelete = Array.from(matchData.current.keys());

    matchData.current.clear();
    setSubmitted(false);

    await Promise.all(
      storeToDelete.map((key) => StoreManager.remove(key.toString()))
    );
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
        getMatchDataMap,
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
