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
  // TBA-specific methods
  tbaMatchData: ProcessedMatchData | null;
  loadTbaMatchData: () => Promise<void>;
  getAllMatchNumbers: () => string[];
  getAllTeamNumbers: () => string[];
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
  const [tbaMatchData, setTbaMatchData] = useState<ProcessedMatchData | null>(
    null
  );
  const [currentEventKey, setCurrentEventKey] = useState<string>("");

  const { children } = props;

  // Load TBA event data on mount
  useEffect(() => {
    loadTbaMatchData();
  }, []);

  /**
   * Determines the maximum number of matches based on event type
   * Event keys follow pattern: YYYY[event_code]
   */
  const getMaxMatchCount = (eventKey: string): number => {
    const eventCode = eventKey.toLowerCase();

    // Championship event 150 matches
    if (eventCode.includes("cmp")) {
      return 150;
    }

    // Default for everything else
    return 100;
  };

  const loadTbaMatchData = useCallback(async () => {
    try {
      const eventData = await StoreManager.getTbaEventData();
      const eventKey = await StoreManager.get(StoreKeys.settings.TBA_EVENT_KEY);

      if (eventData && eventKey) {
        const processed = processEventData(eventData, eventKey);
        setTbaMatchData(processed);
      } else if (eventKey && !eventData) {
        setTbaMatchData(null);
      } else {
        setTbaMatchData(null);
      }
    } catch (error) {
      setTbaMatchData(null);
    }
  }, []);

  // Watch for event key changes and reload data accordingly
  useEffect(() => {
    const checkEventKey = async () => {
      const eventKey = await StoreManager.get(StoreKeys.settings.TBA_EVENT_KEY);
      if (eventKey && eventKey !== currentEventKey) {
        setCurrentEventKey(eventKey);
        await loadTbaMatchData();
      }
    };

    // Check periodically for event key changes (e.g., from settings)
    const interval = setInterval(checkEventKey, 2000);
    return () => clearInterval(interval);
  }, [currentEventKey, loadTbaMatchData]);

  const processEventData = (
    eventData: EventData,
    eventKey: string
  ): ProcessedMatchData => {
    const teamNumbersByMatch = new Map<string, string[]>();
    const allTeamNumbersSet = new Set<string>();

    // Process actual matches if they exist (to map teams to specific matches)
    if (eventData.matches && eventData.matches.length > 0) {
      eventData.matches.forEach((match) => {
        const matchNum = match.match_number.toString();

        // Extract team numbers (remove "frc" prefix)
        const redTeams = match.alliances.red.team_keys.map((key) =>
          key.replace("frc", "")
        );
        const blueTeams = match.alliances.blue.team_keys.map((key) =>
          key.replace("frc", "")
        );
        const matchTeams = [...redTeams, ...blueTeams];

        teamNumbersByMatch.set(matchNum, matchTeams);
        matchTeams.forEach((team) => allTeamNumbersSet.add(team));
      });
    }

    // Add all teams from the teams list (ensures we get all teams even if no matches)
    if (eventData.team_keys && eventData.team_keys.length > 0) {
      eventData.team_keys.forEach((teamKey) => {
        const teamNumber = teamKey.replace("frc", "");
        allTeamNumbersSet.add(teamNumber);
      });
    }

    // Generate match numbers based on event type instead of actual matches
    const maxMatches = getMaxMatchCount(eventKey);
    const matchNumbers = Array.from({ length: maxMatches }, (_, i) =>
      (i + 1).toString()
    );

    console.log(
      `🎯 Generated ${matchNumbers.length} match numbers for event type`
    );

    return {
      matchNumbers,
      teamNumbersByMatch,
      allTeamNumbers: Array.from(allTeamNumbersSet).sort(
        (a, b) => Number(a) - Number(b)
      ),
    };
  };

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

  const clearMatchData = useCallback(async () => {
    const storeToDelete = Array.from(matchData.current.keys());

    matchData.current.clear();
    setSubmitted(false);

    await Promise.all(
      storeToDelete.map((key) =>
        StoreManager.remove(StoreKeys.match.field(key.toString()))
      )
    );
  }, []);

  const getAllMatchNumbers = useCallback((): string[] => {
    if (!tbaMatchData) return [];
    return tbaMatchData.matchNumbers;
  }, [tbaMatchData]);

  const getAllTeamNumbers = useCallback((): string[] => {
    if (!tbaMatchData) return [];
    return tbaMatchData.allTeamNumbers;
  }, [tbaMatchData]);

  const addError = useCallback((error: string) => {
    setErrors((prev) => [...prev, error]);
  }, []);

  const removeError = useCallback((error: string) => {
    setErrors((prevErrors) => prevErrors.filter((e) => e !== error));
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

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
        tbaMatchData,
        loadTbaMatchData,
        getAllMatchNumbers,
        getAllTeamNumbers,
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
