import { Box, CircularProgress, Stack, Typography } from "@mui/material";
import Section from "../UI/Section";
import useSchema from "../hooks/useSchema";

export default function Scout() {
  const { schema, schemaName } = useSchema();

  if (!schema) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="80vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  const schemaData: Schema = schema;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Scouting - {schemaName}
      </Typography>
      <Stack spacing={3}>
        {schemaData.sections.map((section, index) => (
          <Section key={index} section={section} />
        ))}
      </Stack>
    </Box>
  );
}
