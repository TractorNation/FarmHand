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
  | "filler"
  | "";

/** An individual component, type and props */
interface Component {
  name: string;
  id: number;
  note?: string;
  type: ComponentType;
  required?: boolean;
  doubleWidth?: boolean;
  props?: ComponentProps;
}

/** Optional props to pass to a given component */
interface ComponentProps {
  default?: number | boolean;
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
  selectedMatches: number[];
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
  qrCodes: string[];
  archived: boolean;
}
