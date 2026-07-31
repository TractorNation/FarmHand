import { Grid, Typography, Box, Paper } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import DynamicComponent from "./components/DynamicComponent";
import ValidationProvider from "../context/ValidationContext";
import CheckCircleOutlineRounded from "@mui/icons-material/CheckCircleOutlineRounded";
import { useScoutData } from "../context/ScoutDataContext";
import { useMemo } from "react";
import InputCard from "./InputCard";

/**
 * Props for the section component
 */
interface SectionProps {
  section: SectionData;
  /**
   * Whether this section's fields should surface validation errors yet. True once
   * the scout has tried to advance past this step (see Scout's attemptedSteps).
   */
  showErrors: boolean;
}

/**
 * One schema section rendered as a flat panel — the wizard shows exactly one at a
 * time, so there is no expand/collapse state here. Step navigation lives in Scout.
 */
export default function Section(props: SectionProps) {
  const { section, showErrors } = props;
  const theme = useTheme();
  const isWindowsXPTheme = theme.farmhandThemeId === "WindowsXPTheme";
  const { errors } = useScoutData();

  const hasErrorInSection = useMemo(
    () => section.fields.some((field) => errors.has(field.id)),
    [section.fields, errors]
  );

  const showErrorHighlight = hasErrorInSection && showErrors;
  const isSectionComplete = !hasErrorInSection;

  return (
    <Paper
      elevation={0}
      sx={{
        py: isWindowsXPTheme ? 2 : 3,
        px: { xs: 1.5, sm: 3 },
        width: "100%",
        backgroundColor: theme.palette.background.paper,
        borderRadius: isWindowsXPTheme ? 2 : 3,
        borderColor: showErrorHighlight
          ? theme.palette.error.main
          : theme.palette.divider,
        borderWidth: 2,
        borderStyle: "solid",
        transition: "border-color 0.3s ease",
        backgroundImage: isWindowsXPTheme
          ? `linear-gradient(180deg, #fdfdff, #e8eef8)`
          : undefined,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          mb: 2.5,
        }}
      >
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
      </Box>

      <Grid container spacing={2}>
        {section.fields.map((component) => (
          <Grid
            size={{
              xs: 12,
              sm: component.doubleWidth ? 12 : 6,
              md: component.doubleWidth ? 8 : 4,
              lg: component.doubleWidth ? 6 : 3,
            }}
            key={component.id}
            // Scroll anchor for Scout's "jump to the first invalid field" behavior.
            data-field-id={component.id}
          >
            <ValidationProvider>
              <InputCard
                isFiller={component.type === "filler"}
                note={component.note}
                label={component.name}
                required={component.required ?? false}
                submitted={showErrors}
              >
                <DynamicComponent
                  component={component}
                  submitted={showErrors}
                />
              </InputCard>
            </ValidationProvider>
          </Grid>
        ))}
      </Grid>
    </Paper>
  );
}
