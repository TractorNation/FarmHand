import { ChangeEvent } from "react";
import { useSchema } from "../context/SchemaContext";
import { Typography } from "@mui/material";
import DropdownInput from "../ui/components/DropdownInput";

export default function Settings() {
  const { schemaName, availableSchemas, selectSchema } = useSchema();

  const handleSchemaChange = (value: string) => {
    selectSchema(value);
  };

  return (
    <>
      <Typography variant="h4" sx={{ mb: 2 }}>Settings</Typography>
      <DropdownInput
        label="Select Schema"
        options={availableSchemas.map((s) => s.name)}
        value={schemaName || ""}
        onChange={handleSchemaChange}
      />
    </>
  );
}
