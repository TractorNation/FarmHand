import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Grid,
  Typography,
  useTheme,
  Box,
} from "@mui/material";
import DynamicComponent from "./components/DynamicComponent";
import ValidationProvider from "../context/ValidationContext";
import ExpandIcon from "@mui/icons-material/ExpandMoreRounded";
import CheckCircleOutlineRounded from "@mui/icons-material/CheckCircleOutlineRounded";
import { useScoutData } from "../context/ScoutDataContext";
import { useMemo } from "react";
import InputCard from "./InputCard";

/**
 * Props for the section component
 */
interface SectionProps {
  section: SectionData;
  submitted: boolean;
  expanded: boolean;
  onToggle: (isExpanded: boolean) => void;
}

export default function Section(props: SectionProps) {
  const { section, submitted, expanded, onToggle } = props; // Destructure new props
  const theme = useTheme();
  const { errors } = useScoutData();

  const getSectionFields = section.fields.map((field) => field.name);

  const sectionFields = getSectionFields;

  // Check if any field in this section has an error
  const hasErrorInSection = useMemo(
    () => sectionFields.some((field) => errors.includes(field)),
    [sectionFields, errors]
  );

  const showErrorHighlight = hasErrorInSection && !expanded && submitted;
  const isSectionComplete = submitted && !hasErrorInSection;

  return (
    <Accordion
      expanded={expanded}
      disableGutters
      elevation={0}
      sx={{
        py: 3,
        px: 1,
        height: "100%",
        width: "100%",
        display: "flex",
        alignContent: "center",
        flexDirection: "column",
        backgroundColor: theme.palette.background.paper,
        borderRadius: 3,
        borderColor: showErrorHighlight
          ? theme.palette.error.main
          : theme.palette.divider,
        borderWidth: 2,
        borderStyle: "solid",
        transition: "all 0.3s ease",
        "&:before": {
          display: "none",
        },
        "&:hover": !showErrorHighlight
          ? {
              borderColor: theme.palette.primary.main,
            }
          : {},
      }}
    >
      <AccordionSummary
      onClick={(_) => onToggle(!expanded)}
        expandIcon={
          <ExpandIcon
            sx={{
              color: showErrorHighlight
                ? theme.palette.error.main
                : theme.palette.secondary.main,
              fontSize: 32,
            }}
          />
        }
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            {section.title}
          </Typography>
          {isSectionComplete && (
            <CheckCircleOutlineRounded
              sx={{
                color: theme.palette.success.main,
                fontSize: 24,
                ml: 1,
              }}
            />
          )}
          {hasErrorInSection && submitted && (
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: theme.palette.error.main,
              }}
            />
          )}
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Grid container spacing={2}>
          {section.fields.map((component, index) => (
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={index}>
              <ValidationProvider key={component.id}>
                <InputCard
                  label={component.name}
                  required={component.required ?? false}
                  submitted={submitted}
                >
                  <DynamicComponent
                    component={component}
                    submitted={submitted}
                  />
                </InputCard>
              </ValidationProvider>
            </Grid>
          ))}
        </Grid>
      </AccordionDetails>

      {/* Bottom AccordionSummary for collapsing */}
      <AccordionSummary
      onClick={(_) => onToggle(!expanded)}
        expandIcon={
          <ExpandIcon
            sx={{
              color: showErrorHighlight
                ? theme.palette.error.main
                : theme.palette.secondary.main,
              fontSize: 32,
              transform: "rotate(180deg)",
            }}
          />
        }
        sx={{
          minHeight: 48,
          borderTop: `1px solid ${theme.palette.divider}`,
          "& .MuiAccordionSummary-content": { margin: 0 },
        }}
      />
    </Accordion>
  );
}
