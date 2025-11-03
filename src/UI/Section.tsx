import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Card,
  Grid,
  Typography,
  useTheme,
} from "@mui/material";
import DynamicComponent from "./components/DynamicComponent";
import ValidationProvider from "../context/ValidationContext";
import { useState } from "react";
import ExpandIcon from "@mui/icons-material/ExpandMoreRounded";
import { useScoutData } from "../context/ScoutDataContext";

/**
 * Props for the section component
 */
interface SectionProps {
  section: SectionData;
}

export default function Section(props: SectionProps) {
  const { section } = props;
  const [expanded, setExpanded] = useState(true);
  const theme = useTheme();
  const { errors, submitted } = useScoutData();

  const handleExpansion = () => {
    setExpanded((prevExpanded) => !prevExpanded);
  };

  const sectionFields = section.fields.map((field) => field.name);
  const hasErrorInSection = sectionFields.some((field) =>
    errors.includes(field)
  );

  // Highlight the section if it has an error, is collapsed, and the form has been submitted.
  const showErrorHighlight = hasErrorInSection && !expanded && submitted;

  return (
    <>
      <Accordion
        expanded={expanded}
        square
        disableGutters
        onChange={handleExpansion}
        elevation={0}
        sx={{
          p: 3,
          minWidth: "fit-content",
          height: "100%",
          display: "flex",
          alignContent: "center",
          flexDirection: "column",
          backgroundColor: theme.palette.background.paper,
          borderRadius: 2,
          borderColor: showErrorHighlight
            ? theme.palette.error.main
            : theme.palette.divider,
          borderWidth: 2,
          borderStyle: "solid",
          "&:before": {
            display: "none",
          },
        }}
      >
        <AccordionSummary expandIcon={<ExpandIcon />} sx={{ p: 0 }}>
          <Typography variant="h5" sx={{ my: 2, mx: 1 }}>
            {section.title}
          </Typography>
        </AccordionSummary>
        <AccordionDetails sx={{}}>
          <Grid container spacing={2}>
            {section.fields.map((component, index) => (
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={index}>
                <ValidationProvider>
                  <DynamicComponent component={component} />
                </ValidationProvider>
              </Grid>
            ))}
          </Grid>
        </AccordionDetails>
      </Accordion>
    </>
  );
}
