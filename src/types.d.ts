/**
 * Holds data about a specific schema and all of its components
 */
interface Schema {
  sections: SectionData[];
}

/** Stores data inside a particular section, title and components */
interface SectionData {
  title: string;
  fields: Component[];
}

/** An individual component, type and props */
interface Component {
  name: string;
  id: number;
  type: string;
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
  onChange?: (value: any) => void;
}

interface QrCode {
  name: string;
  data: string;
  image: string;
}
