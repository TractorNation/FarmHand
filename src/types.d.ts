declare module "*.ttf";

declare module "*.md";

/**
 * Holds data about a specific schema and all of its components
 */
interface Schema {
  name: string;
  sections: SectionData[];
}

/** Stores data inside a particular section, title and components */
interface SectionData {
  title: string;
  fields: Component[];
}

/** The options for a component type */
type ComponentType =
  | "checkbox"
  | "counter"
  | "dropdown"
  | "multiplechoice"
  | "text"
  | "number"
  | "slider"
  | "timer"
  | "grid"
  | "autopath"
  | "filler"
  | "";

/** A game piece a scout can arm before logging an auto-path event. */
interface PathOption {
  label: string;
  /** Key into PATH_ICON_REGISTRY — the key travels on the wire, not a component. */
  icon: string;
}

/** An action a scout can log at a point along the auto path. */
interface PathAction extends PathOption {
  /** Optional outcomes, e.g. ["Made", "Missed"]. Max MAX_PATH_RESULTS. */
  results?: string[];
}

/** An individual component, type and props */
interface Component {
  name: string;
  id: number;
  note?: string;
  type: ComponentType;
  required?: boolean;
  doubleWidth?: boolean;
  persist?: boolean;
  props?: ComponentProps;
}

/** Optional props to pass to a given component */
interface ComponentProps {
  /**
   * A range slider's default is a `[min, max]` pair — `EditableComponentCard` reads
   * and writes it as an array, and `DynamicComponent` passes it straight through as
   * the empty state.
   */
  default?: number | boolean | number[];
  max?: number;
  min?: number;
  label?: string;
  valid?: boolean;
  multiline?: boolean;
  options?: string[];
  step?: number;
  selectsRange?: boolean;
  rows?: number;
  cols?: number;
  cellLabel?: string;
  onChange?: (value: any) => void;
  pullFromTBA?: boolean; // Whether to pull data from TBA API

  // --- autopath only ---
  /**
   * Per-schema playing field image key. Falls back to Settings.FIELD_IMAGE_KEY when
   * unset or when the key names a file this device does not have — schemas travel
   * between devices by QR, so a dangling reference must degrade, not break.
   */
  fieldImageKey?: string;
  /** Selectable game pieces. Max MAX_PATH_PIECES. */
  gamePieces?: PathOption[];
  /** Selectable actions. Max MAX_PATH_ACTIONS. At least one is required. */
  pathActions?: PathAction[];
  /** Ramer-Douglas-Peucker epsilon in grid units. Defaults to DEFAULT_PATH_EPSILON. */
  simplifyEpsilon?: number;
}

/** Data about a specific qr code */
interface QrCode {
  name: string;
  data: string;
  image: string;
  archived?: boolean;
  scanned?: boolean;
}

/**
 * Interface to store data about a single Schema
 */
interface SchemaMetaData {
  name: string;
  path: string;
  schema: Schema;
  type: "default" | "generated";
  /**
   * Hash this schema had on the device it was imported from, when known.
   *
   * Match codes are looked up by the hash their originating device computed, which
   * can differ from the locally recomputed one because the schema-QR encoding
   * normalizes key order. Checked ahead of the local hash by getSchemaFromHash.
   */
  originHash?: string;
}

/** Represents an event with its name and unique id */
type TbaEvent = {
  key: string;
  name: string;
  short_name?: string;
  start_date: string;
  end_date: string;
};

/** Represents a team from TBA */
interface TbaTeam {
  key: string;
  team_number: number;
  nickname?: string;
}

/** Represents match data from TBA API */
interface TbaMatch {
  key: string;
  comp_level: string;
  match_number: number;
  alliances: {
    red: {
      team_keys: string[];
    };
    blue: {
      team_keys: string[];
    };
  };
}

/** Combined event data with both matches and teams */
interface EventData {
  matches: TbaMatch[];
  teams: TbaTeam[];
  team_keys: string[]; // All unique team keys at the event
}

/** Processed match data for easy access */
interface ProcessedMatchData {
  matchNumbers: string[];
  teamNumbersByMatch: Map<string, string[]>;
  /** Reverse map: plain integer string → prefixed label (e.g. "78" → "Qual-78"). Ambiguous numbers map to empty string. */
  numberToLabel: Map<string, string>;
  allTeamNumbers: string[];
}

/**Stores all the settings and data about them */
interface Settings {
  LAST_SCHEMA_NAME: string;
  THEME: string;
  DEVICE_ID: number;
  TBA_API_KEY: string;
  TBA_EVENT_KEY: string;
  EXPECTED_DEVICES_COUNT: number;
  AUTOSAVE_ON_COMPLETE: boolean;
  LEAD_SCOUT_ONLY: boolean;
  COLOR_THEME: string;
  /**
   * Filename of the default playing field image under
   * $APPLOCALDATA/field-images/. Empty string means "use the bundled placeholder".
   */
  FIELD_IMAGE_KEY: string;
}

/** Options for filtering qr codes */
type FilterOption =
  | "match number"
  | "team number"
  | "day"
  | "week"
  | "month"
  | "date range"
  | "unscanned"
  | "none";

/** Options for sorting qr codes */
type SortMode = "match number" | "recent" | "none";

/** The direction to sort codes by */
type SortDirection = "ascending" | "descending";

interface Analysis {
  id: number;
  name: string;
  selectedTeams: number[];
  selectedMatches: string[];
  charts: Chart[];
  createdAt: Date;
  schemaHash: string;
}

interface Chart {
  id: string;
  name: string;
  type: "bar" | "line" | "pie" | "scatter" | "boxplot" | "heatmap";
  xAxis?: string;
  yAxis?: string;
  groupBy?: string;
  aggregation?: "sum" | "average" | "count" | "min" | "max";
  sortMode?: "ascending" | "descending" | "none";
  linearInterpolation?: // for line charts
  | "basis"
    | "cardinal"
    | "catmullRom"
    | "linear"
    | "monotoneX"
    | "monotoneY"
    | "natural"
    | "step"
    | "stepAfter"
    | "stepBefore";
  colorScheme?: string; // For heatmap color scheme selection
}

/// To store QR codes in a "Folder"
interface QrFolder {
  id: string;
  name: string;
  createdAt: number;
  /** Membership by code name; there is no back-pointer from a code to its folder. */
  qrCodes: string[];
  /**
   * Optional because folders saved before this field existed are still on disk, and
   * nothing validates the stored JSON on read. `useFolderManager` reads it as
   * `archived ?? false` for exactly that reason — the type has to admit the same
   * possibility or that defence looks like dead code.
   */
  archived?: boolean;
}
