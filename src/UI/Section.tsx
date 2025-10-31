import { Card, Grid, Stack, Typography } from "@mui/material";
import DynamicComponent from "./components/DynamicComponent";

/**
 * Props for the section component
 */
interface SectionProps {
  section: SectionData;
}

export default function Section(props: SectionProps) {
  const { section } = props;

  return (
    <Card
      sx={{
        p: 1.5,
        minWidth: "fit-content",
        height: "100%",
      }}
    >
      <Stack
        direction={"column"}
        width={"100%"}
        justifyContent={"space-between"}
        alignContent={"center"}
        sx={{ px: 2, py: 3 }}
      >
        <Typography variant="h5">{section.title}</Typography>
        <Grid container spacing={2}>
          {section.fields.map((component, index) => (
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={index}>
              <DynamicComponent component={component} />
            </Grid>
          ))}
        </Grid>
      </Stack>
    </Card>
  );
}
