import {
  Box,
  LinearProgress,
  Step,
  StepButton,
  StepLabel,
  Stepper,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";

export interface ScoutStep {
  title: string;
  /** True when this step has at least one unsatisfied required field. */
  hasError: boolean;
}

interface ScoutStepperProps {
  steps: ScoutStep[];
  activeStep: number;
  /** Highest step reached so far; steps at or below this are navigable. */
  maxVisitedStep: number;
  onStepClick: (index: number) => void;
}

/**
 * Progress indicator for the scouting wizard.
 *
 * Uses real MUI breakpoints rather than an orientation query — a phone held
 * sideways is still a phone, and the full Stepper does not fit there.
 */
export default function ScoutStepper({
  steps,
  activeStep,
  maxVisitedStep,
  onStepClick,
}: ScoutStepperProps) {
  const theme = useTheme();
  const isCompact = useMediaQuery(theme.breakpoints.down("sm"));

  if (isCompact) {
    const current = steps[activeStep];
    return (
      <Box sx={{ mb: 3 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 1,
            mb: 0.75,
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600 }} noWrap>
            {current?.title}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ flexShrink: 0 }}
          >
            Step {activeStep + 1} of {steps.length}
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={((activeStep + 1) / steps.length) * 100}
          color={current?.hasError ? "error" : "primary"}
          sx={{ height: 6, borderRadius: 3 }}
        />
      </Box>
    );
  }

  return (
    <Stepper
      nonLinear
      alternativeLabel
      activeStep={activeStep}
      sx={{ mb: 4 }}
    >
      {steps.map((step, index) => {
        const visited = index <= maxVisitedStep;
        return (
          <Step key={step.title} completed={visited && !step.hasError}>
            <StepButton
              onClick={() => onStepClick(index)}
              disabled={!visited}
              // Generous hit area so this stays usable on a touchscreen laptop.
              sx={{ py: 1.5, borderRadius: 2 }}
            >
              <StepLabel error={visited && step.hasError}>
                {step.title}
              </StepLabel>
            </StepButton>
          </Step>
        );
      })}
    </Stepper>
  );
}
