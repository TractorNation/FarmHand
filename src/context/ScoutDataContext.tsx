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
import { getMatchSortKey, MATCH_PREFIX } from "../utils/GeneralUtils";

interface ScoutDataContextType {
  getMatchDataMap: () => Map<number, any>;
  addMatchData: (key: number, val: any) => void;
  getMatchData: (key: number) => any;
  clearMatchData: (persistedEntries?: { key: number; value: any }[]) => Promise<void>;
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
  // Watched fields for auto-populating Team Number
  setWatchedMatchNumber: (val: string | null) => void;
  setWatchedAlliance: (val: string | null) => void;
  setWatchedPosition: (val: string | null) => void;
  getTeamForCurrentSlot: () => string | null;
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

  // Reactive state for the three fields that determine which team occupies a slot.
  // These are set by DynamicComponent when the user changes Match Number, Alliance, or Position,
  // and are read by getTeamForCurrentSlot() to derive the correct Team Number.
  const [watchedMatchNumber, setWatchedMatchNumber] = useState<string | null>(null);
  const [watchedAlliance, setWatchedAlliance] = useState<string | null>(null);
  const [watchedPosition, setWatchedPosition] = useState<string | null>(null);

  const { children } = props;

  // Load TBA event data on mount
  useEffect(() => {
    loadTbaMatchData();
  }, []);

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

    checkEventKey();
  }, [currentEventKey, loadTbaMatchData]);

  const processEventData = (
    eventData: EventData,
    _eventKey: string
  ): ProcessedMatchData => {
    const teamNumbersByMatch = new Map<string, string[]>();
    const allTeamNumbersSet = new Set<string>();

    // Generate a prefixed label for each match based on comp level.
    // sf matches use set_number (parsed from key) so both games in a series
    // share the same label — the first game encountered wins for slot mapping
    // since both games have the same six teams.
    const getMatchLabel = (match: TbaMatch): string => {
      const prefix = MATCH_PREFIX[match.comp_level];
      if (match.comp_level === "sf") {
        const sfMatch = match.key.match(/_sf(\d+)m\d+$/);
        const setNumber = sfMatch ? sfMatch[1] : match.match_number.toString();
        return `${prefix}-${setNumber}`;
      }
      return prefix
        ? `${prefix}-${match.match_number}`
        : match.match_number.toString();
    };

    const matchLabelSet = new Set<string>();

    if (eventData.matches && eventData.matches.length > 0) {
      eventData.matches.forEach((match) => {
        const label = getMatchLabel(match);
        matchLabelSet.add(label);

        const redTeams = match.alliances.red.team_keys.map((key) =>
          key.replace("frc", "")
        );
        const blueTeams = match.alliances.blue.team_keys.map((key) =>
          key.replace("frc", "")
        );
        const matchTeams = [...redTeams, ...blueTeams];

        // First occurrence wins — both games in an sf series have the same teams
        if (!teamNumbersByMatch.has(label)) {
          teamNumbersByMatch.set(label, matchTeams);
        }
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

    let matchNumbers: string[];
    if (matchLabelSet.size > 0) {
      // Sort: Qual ascending, then Semis ascending, then Final ascending
      matchNumbers = Array.from(matchLabelSet).sort((a, b) => {
        const [aLevel, aNum] = getMatchSortKey(a);
        const [bLevel, bNum] = getMatchSortKey(b);
        return aLevel !== bLevel ? aLevel - bLevel : aNum - bNum;
      });
    } else {
      // Fallback: no match data available yet, generate plain 1–100
      matchNumbers = Array.from({ length: 100 }, (_, i) => (i + 1).toString());
    }

    // Build reverse map: plain trailing number → prefixed label.
    // If two labels share a trailing number (ambiguous), map to empty string
    // so the fallback lookup won't guess wrong.
    const numberToLabel = new Map<string, string>();
    for (const label of matchLabelSet) {
      const dashIdx = label.indexOf("-");
      const num = dashIdx !== -1 ? label.substring(dashIdx + 1) : label;
      numberToLabel.set(num, numberToLabel.has(num) ? "" : label);
    }

    return {
      matchNumbers,
      teamNumbersByMatch,
      numberToLabel,
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

  const clearMatchData = useCallback(async (persistedEntries?: { key: number; value: any }[]) => {
    const storeToDelete = Array.from(matchData.current.keys());

    matchData.current.clear();
    setSubmitted(false);
    // Reset watched fields so a cleared form doesn't retain stale slot state
    setWatchedMatchNumber(null);
    setWatchedAlliance(null);
    setWatchedPosition(null);

    await Promise.all(
      storeToDelete.map((key) =>
        StoreManager.remove(StoreKeys.match.field(key.toString()))
      )
    );

    // Re-write any entries that should survive the clear (persist fields, incremented match number)
    if (persistedEntries && persistedEntries.length > 0) {
      await Promise.all(
        persistedEntries.map(({ key, value }) => {
          matchData.current.set(key, value);
          return StoreManager.set(StoreKeys.match.field(key.toString()), value);
        })
      );
    }
  }, []);

  const getAllMatchNumbers = useCallback((): string[] => {
    if (!tbaMatchData) return [];
    return tbaMatchData.matchNumbers;
  }, [tbaMatchData]);

  const getAllTeamNumbers = useCallback((): string[] => {
    if (!tbaMatchData) return [];
    return tbaMatchData.allTeamNumbers;
  }, [tbaMatchData]);

  /**
   * Gets the team number based on match/alliance/position field values.
   * teamNumbersByMatch stores teams as [red1, red2, red3, blue1, blue2, blue3],
   * so position is 0-indexed and blue adds an offset of 3.
   * Returns null if any of the three inputs are missing or the slot can't be found.
   */
  const getTeamForCurrentSlot = useCallback((): string | null => {
    if (!tbaMatchData || !watchedMatchNumber || !watchedAlliance || !watchedPosition) {
      return null;
    }

    // Direct lookup by label (e.g. "Qual-78")
    let teams = tbaMatchData.teamNumbersByMatch.get(watchedMatchNumber);

    // Prefix-agnostic fallback: if the user typed a plain integer (e.g. "78"),
    // resolve it via the pre-built reverse map (O(1) instead of scanning all keys).
    // Empty string in the map means ambiguous — don't auto-populate.
    if (!teams) {
      const resolved = tbaMatchData.numberToLabel.get(watchedMatchNumber);
      if (resolved) {
        teams = tbaMatchData.teamNumbersByMatch.get(resolved);
      }
    }

    if (!teams || teams.length < 6) return null;
    const posIndex = parseInt(watchedPosition, 10) - 1; // schema uses "1"/"2"/"3"
    if (posIndex < 0 || posIndex > 2) return null;
    const allianceOffset = watchedAlliance.toLowerCase() === "blue" ? 3 : 0;
    return teams[allianceOffset + posIndex] ?? null;
  }, [tbaMatchData, watchedMatchNumber, watchedAlliance, watchedPosition]);

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
        setWatchedMatchNumber,
        setWatchedAlliance,
        setWatchedPosition,
        getTeamForCurrentSlot,
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
