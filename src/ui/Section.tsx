import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Grid,
  Typography,
  Box,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
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
  const { section, submitted, expanded, onToggle } = props;
  const theme = useTheme();
  const isWindowsXPTheme = theme.farmhandThemeId === "WindowsXPTheme";
  const { errors } = useScoutData();

  // Check if any field in this section has an error
  const hasErrorInSection = useMemo(
    () => section.fields.some((field) => errors.includes(field.name)),
    [section.fields, errors]
  );

  const showErrorHighlight = hasErrorInSection && !expanded && submitted;
  const isSectionComplete = submitted && !hasErrorInSection;

  return (
    <Accordion
      expanded={expanded}
      onChange={(_, isExpanded) => onToggle(isExpanded)}
      disableGutters
      elevation={0}
      sx={{
        py: isWindowsXPTheme ? 2 : 3,
        px: 1,
        height: "100%",
        width: "100%",
        display: "flex",
        alignContent: "center",
        flexDirection: "column",
        backgroundColor: theme.palette.background.paper,
        borderRadius: isWindowsXPTheme ? 2 : 3,
        borderColor: showErrorHighlight
          ? theme.palette.error.main
          : theme.palette.divider,
        borderWidth: 2,
        borderStyle: "solid",
        transition: "all 0.3s ease",
        backgroundImage: isWindowsXPTheme
          ? `linear-gradient(180deg, #fdfdff, #e8eef8)`
          : undefined,
        "&:before": {
          display: "none",
        },
        "&:hover": !showErrorHighlight
          ? {
              borderColor: isWindowsXPTheme
                ? alpha(theme.palette.primary.main, 0.7)
                : theme.palette.primary.main,
            }
          : {},
      }}
    >
      <AccordionSummary
        expandIcon={
          <ExpandIcon
            sx={{
              color: showErrorHighlight
                ? theme.palette.error.main
                : isWindowsXPTheme
                ? "#103f91"
                : theme.palette.secondary.main,
              fontSize: 32,
            }}
          />
        }
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 600,
              ...(isWindowsXPTheme && {
                fontFamily: '"Trebuchet MS", "Tahoma", sans-serif',
                fontSize: "1rem",
                color: "#0f3fa6",
              }),
            }}
          >
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
            <Grid
              size={{
                xs: component.doubleWidth ? 12 : 12,
                sm: component.doubleWidth ? 12 : 6,
                md: component.doubleWidth ? 4 : 4,
                lg: component.doubleWidth ? 6 : 3,
              }}
              key={index}
            >
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
        onClick={(e) => {
          e.stopPropagation();
          onToggle(!expanded);
        }}
        expandIcon={
          <ExpandIcon
            sx={{
              color: showErrorHighlight
                ? theme.palette.error.main
                : isWindowsXPTheme
                ? "#103f91"
                : theme.palette.secondary.main,
              fontSize: 32,
              transform: "rotate(180deg)",
            }}
          />
        }
        sx={{
          minHeight: 48,
          borderTop: `1px solid ${
            isWindowsXPTheme ? alpha("#000", 0.15) : theme.palette.divider
          }`,
          "& .MuiAccordionSummary-content": { margin: 0 },
        }}
      />
    </Accordion>
  );
}
