import testSchema from "../config/schema/test.json";
import Reefscape from "../config/schema/2025Reefscape.json";

export const defaultSchemas: SchemaMetaData[] = [
  {
    name: "Test Schema",
    path: "../config/schema/test.json",
    schema: testSchema as Schema,
  },
  {
    name: "2025 Reefscape",
    path: "../config/schema/2025Reefscape.json",
    schema: Reefscape as Schema,
  },
];