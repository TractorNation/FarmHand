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

type ComponentType =
  | "checkbox"
  | "counter"
  | "dropdown"
  | "text"
  | "number"
  | "slider"
  | "timer"
  | "grid"
  | "filler";

/** An individual component, type and props */
interface Component {
  name: string;
  id: number;
  type: ComponentType;
  required?: boolean;
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
  onChange?: (value: any) => void;
}

interface QrCode {
  name: string;
  data: string;
  image: string;
  archived?: boolean;
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

/**Stores all the settings and data about them */
interface Settings {
  LAST_SCHEMA_NAME?: string;
  THEME: string;
  DEVICE_ID: number;
  EXPECTED_DEVICES_COUNT: number;
  LEAD_SCOUT_ONLY: boolean;
}

/* Options for filtering qr codes */
type FilterOption =
  | "match number"
  | "team number"
  | "day"
  | "week"
  | "month"
  | "none";

/* Options for sorting qr codes */
type SortMode = "match number" | "recent" | "none";

/*The direction to sort codes by */
type SortDirection = "ascending" | "descending";
