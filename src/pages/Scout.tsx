import {
  Alert,
  AlertTitle,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogTitle,
  Slide,
  Snackbar,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import Section from "../ui/Section";
import { useSchema } from "../context/SchemaContext";
import { useScoutData } from "../context/ScoutDataContext";
import { useState, Key, useRef, useCallback, useMemo } from "react";
import ResetIcon from "@mui/icons-material/ReplayRounded";
import HelpIcon from "@mui/icons-material/HelpOutlineRounded";
import QrCodeIcon from "@mui/icons-material/QrCodeRounded";
import AddChartIcon from "@mui/icons-material/AddchartRounded";
import BackIcon from "@mui/icons-material/ArrowBackRounded";
import NextIcon from "@mui/icons-material/ArrowForwardRounded";

import useDialog from "../hooks/useDialog";
import { QrCodeBuilder } from "../utils/QrUtils";
import { getFieldDefault, getFieldValueByName, orderedFields } from "../utils/schemaFields";
import PageHeader from "../ui/PageHeader";
import { useSettings } from "../context/SettingsContext";
import CompleteScoutDialog from "../ui/dialog/CompleteScoutDialog";
import WarningDialog from "../ui/dialog/WarningDialog";
import ScoutStepper, { ScoutStep } from "../ui/scout/ScoutStepper";
import ScoutContextBar from "../ui/scout/ScoutContextBar";
import MatchDataReview from "../ui/scout/MatchDataReview";
import { buildPersistedEntries } from "../utils/matchAdvance";

export default function Scout() {
  const { schema, hash, schemaName } = useSchema();
  const theme = useTheme();
  const isCompact = useMediaQuery(theme.breakpoints.down("sm"));
  const {
    errors,
    clearMatchData,
    setSubmitted,
    clearErrors,
    getMatchDataMap,
    getAllMatchNumbers,
  } = useScoutData();
  const { settings } = useSettings();
  const [resetKey, setResetKey] = useState<Key>(0);
  const [showResetPopup, openResetPopup, closeResetPopup] = useDialog();
  const [
    showUnsavedResetWarning,
    openUnsavedResetWarning,
    closeUnsavedResetWarning,
  ] = useDialog();

  const [
    showCompleteScoutDialog,
    openCompleteScoutDialog,
    closeCompleteScoutDialog,
  ] = useDialog();
  const [showSuccessSnackbar, setShowSuccessSnackbar] = useState(false);
  const qrCodeData = useRef<QrCode | null>(null);
  const isSavedRef = useRef<boolean>(false);

  // Wizard position. The last step (index === sections.length) is the review screen.
  const [stepIndex, setStepIndex] = useState(0);
  const [maxVisitedStep, setMaxVisitedStep] = useState(0);
  // Steps the scout has tried to leave. A field only turns red after its own step
  // has been attempted, so an untouched form isn't a wall of errors.
  const [attemptedSteps, setAttemptedSteps] = useState<Set<number>>(new Set());
  const [blocked, setBlocked] = useState<{ id: number; name: string }[]>([]);

  const deviceID = settings.DEVICE_ID;
  const sections = schema?.sections ?? [];
  const reviewStepIndex = sections.length;
  const isReviewStep = stepIndex === reviewStepIndex;

  /** Required-but-unsatisfied fields within one section. */
  const fieldsWithErrors = useCallback(
    (sectionIndex: number) =>
      (sections[sectionIndex]?.fields ?? [])
        .filter((f) => errors.has(f.id))
        .map((f) => ({ id: f.id, name: f.name })),
    [sections, errors]
  );

  const steps = useMemo<ScoutStep[]>(
    () => [
      ...sections.map((section) => ({
        title: section.title,
        hasError: section.fields.some((f) => errors.has(f.id)),
      })),
      { title: "Review", hasError: errors.size > 0 },
    ],
    [sections, errors]
  );

  const scrollToField = (fieldId: number) => {
    // Runs after the Alert renders so the target isn't shifted out from under us.
    requestAnimationFrame(() => {
      document
        .querySelector(`[data-field-id="${fieldId}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  const goToStep = useCallback((next: number) => {
    setStepIndex(next);
    setMaxVisitedStep((prev) => Math.max(prev, next));
    setBlocked([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleNext = () => {
    setAttemptedSteps((prev) => new Set(prev).add(stepIndex));

    const bad = fieldsWithErrors(stepIndex);
    if (bad.length > 0) {
      // Next stays enabled and explains itself rather than going dead — on a
      // touchscreen there is no hover to reveal why a disabled button is disabled.
      setBlocked(bad);
      scrollToField(bad[0].id);
      return;
    }

    goToStep(stepIndex + 1);
  };

  const handleBack = () => {
    if (stepIndex === 0) return;
    goToStep(stepIndex - 1);
  };

  // Collects entries that should survive a form clear. See utils/matchAdvance.ts for
  // the persist and match-number-advancement rules.
  const buildPersistedEntriesFor = (incrementMatchNumber: boolean) =>
    buildPersistedEntries({
      fields: orderedFields(schema!),
      matchData: getMatchDataMap(),
      allMatchNumbers: getAllMatchNumbers(),
      incrementMatchNumber,
    });

  /** Shared teardown for every path that empties the form. */
  const resetForm = async (incrementMatchNumber: boolean, startStep: number) => {
    await clearMatchData(buildPersistedEntriesFor(incrementMatchNumber));
    clearErrors();
    setResetKey((prev) => (prev as number) + 1);
    setAttemptedSteps(new Set());
    setBlocked([]);
    setStepIndex(startStep);
    setMaxVisitedStep(startStep);
    isSavedRef.current = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCompleteScout = async () => {
    // Mark as saved (autosave is handled in CompleteScoutDialog)
    isSavedRef.current = true;

    closeCompleteScoutDialog();

    if (settings.AUTOSAVE_ON_COMPLETE) {
      setShowSuccessSnackbar(true);
    }

    // If Match Number pulls from TBA, it auto-advances through the schedule
    // and Team Number re-populates, so skip to the next section (index 1).
    // Otherwise (e.g. pit scouting where Match Number is always 0), start at
    // Match Info so the user can select the next team.
    const matchNumberAdvances = schema!.sections.some((s) =>
      s.fields.some((f) => f.name === "Match Number" && f.props?.pullFromTBA === true)
    );
    await resetForm(true, matchNumberAdvances && sections.length > 1 ? 1 : 0);
  };

  const handleSubmit = () => {
    setSubmitted(true);

    if (errors.size > 0) {
      // Reachable only by jumping back via the stepper and clearing a required
      // field, then returning to Review.
      setBlocked([...errors].map(([id, name]) => ({ id, name })));
      return;
    }

    handleGenerateQr();
  };

  const handleResetClick = () => {
    if (!isSavedRef.current) {
      openUnsavedResetWarning();
      return;
    }
    openResetPopup();
  };

  const handleReset = async () => {
    await resetForm(false, 0);
    closeResetPopup();
  };

  const handleConfirmReset = async () => {
    await resetForm(false, 0);
    closeUnsavedResetWarning();
  };

  const handleGenerateQr = async () => {
    const matchData = getMatchDataMap();
    const schemaHash = hash ?? "000000";

    const teamNumber = getFieldValueByName("Team Number", schema!, matchData)
      ?? getFieldDefault("Team Number", schema!);
    const matchNumber = getFieldValueByName("Match Number", schema!, matchData)
      ?? getFieldDefault("Match Number", schema!);
    const qr = await QrCodeBuilder.build.MATCH(
      schema!,
      schemaHash,
      matchData,
      [teamNumber!, matchNumber!],
      deviceID
    );
    qrCodeData.current = qr;
    openCompleteScoutDialog();
  };

  if (!schema) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <>
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        <PageHeader
          icon={<AddChartIcon sx={{ fontSize: 28 }} />}
          title={schemaName ?? "Scout Match"}
          subtitle="Fill out the form to record match data"
        />

        <ScoutStepper
          steps={steps}
          activeStep={stepIndex}
          maxVisitedStep={maxVisitedStep}
          onStepClick={goToStep}
        />

        <ScoutContextBar schema={schema} />

        {blocked.length > 0 && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            <AlertTitle sx={{ fontWeight: 600 }}>
              {isReviewStep
                ? "Some required fields are still empty"
                : "Finish this section to continue"}
            </AlertTitle>
            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              sx={{ flexWrap: "wrap" }}
            >
              {blocked.map((field) => (
                <Button
                  key={field.id}
                  size="small"
                  color="error"
                  variant="outlined"
                  onClick={() => {
                    if (isReviewStep) {
                      const owner = sections.findIndex((s) =>
                        s.fields.some((f) => f.id === field.id)
                      );
                      if (owner !== -1) {
                        setAttemptedSteps((prev) => new Set(prev).add(owner));
                        goToStep(owner);
                      }
                    }
                    scrollToField(field.id);
                  }}
                  sx={{ borderRadius: 2, minHeight: 36, textTransform: "none" }}
                >
                  {field.name}
                </Button>
              ))}
            </Stack>
          </Alert>
        )}

        {/*
          Every section stays mounted and inactive ones are hidden, rather than
          rendering only the active section. Field validity is registered by each
          DynamicComponent on mount and withdrawn on unmount, so unmounting the
          off-screen sections would silently erase their errors — the stepper would
          then mark an incomplete section green. This also avoids a skeleton flash
          on every step change and keeps the TBA Team Number autofill alive.
        */}
        <Box key={resetKey}>
          {sections.map((section, index) => (
            <Box
              key={section.title}
              sx={{ display: index === stepIndex ? "block" : "none" }}
            >
              <Section
                section={section}
                showErrors={attemptedSteps.has(index)}
              />
            </Box>
          ))}
        </Box>

        {isReviewStep && (
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
              Review match data
            </Typography>
            <MatchDataReview
              schema={schema}
              values={getMatchDataMap()}
              onEditSection={(sectionIndex) => {
                setAttemptedSteps((prev) => new Set(prev).add(sectionIndex));
                goToStep(sectionIndex);
              }}
            />
          </Box>
        )}

        {/* Navigation */}
        <Stack
          direction={isCompact ? "column-reverse" : "row"}
          spacing={2}
          width="100%"
          justifyContent="space-between"
          alignItems={isCompact ? "stretch" : "center"}
          sx={{ mt: 3 }}
        >
          <Button
            variant="outlined"
            color="warning"
            size="large"
            fullWidth={isCompact}
            sx={{
              borderRadius: 2,
              borderWidth: 2,
              minHeight: 48,
              "&:hover": { borderWidth: 2 },
            }}
            onClick={handleResetClick}
            startIcon={<ResetIcon />}
          >
            Reset form
          </Button>

          <Stack
            direction="row"
            spacing={2}
            sx={{ width: isCompact ? "100%" : "auto" }}
          >
            <Button
              variant="outlined"
              color="secondary"
              size="large"
              disabled={stepIndex === 0}
              onClick={handleBack}
              startIcon={<BackIcon />}
              fullWidth={isCompact}
              sx={{
                borderRadius: 2,
                borderWidth: 2,
                minHeight: 48,
                "&:hover": { borderWidth: 2 },
              }}
            >
              Back
            </Button>

            {isReviewStep ? (
              <Button
                variant="contained"
                color="primary"
                size="large"
                onClick={handleSubmit}
                startIcon={<QrCodeIcon />}
                fullWidth={isCompact}
                sx={{ borderRadius: 2, px: 4, minHeight: 48 }}
              >
                Complete scout
              </Button>
            ) : (
              <Button
                variant="contained"
                color="primary"
                size="large"
                onClick={handleNext}
                endIcon={<NextIcon />}
                fullWidth={isCompact}
                sx={{ borderRadius: 2, px: 4, minHeight: 48 }}
              >
                {stepIndex === reviewStepIndex - 1 ? "Review" : "Next"}
              </Button>
            )}
          </Stack>
        </Stack>
      </Box>

      {/* Reset confirmation popup */}
      <Dialog
        open={showResetPopup}
        onClose={closeResetPopup}
        slotProps={{ paper: { sx: { borderRadius: 3, minWidth: 'fit-content' } } }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            fontWeight: 600,
          }}
        >
          <HelpIcon sx={{ mr: 1 }} color="primary" />
          Are you sure you want to reset the form?
        </DialogTitle>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={closeResetPopup} sx={{ borderRadius: 2 }}>
            Cancel
          </Button>
          <Button
            onClick={handleReset}
            color="error"
            variant="contained"
            sx={{ borderRadius: 2 }}
          >
            Reset
          </Button>
        </DialogActions>
      </Dialog>

      {/* Complete Scout Dialog */}
      {qrCodeData.current && (
        <CompleteScoutDialog
          open={showCompleteScoutDialog}
          onClose={closeCompleteScoutDialog}
          onComplete={handleCompleteScout}
          qrCode={qrCodeData.current}
          schema={schema!}
          matchData={getMatchDataMap()}
          autosave={settings.AUTOSAVE_ON_COMPLETE}
        />
      )}

      {/* Unsaved Reset Warning */}
      <WarningDialog
        open={showUnsavedResetWarning}
        onClose={closeUnsavedResetWarning}
        onConfirm={handleConfirmReset}
        title="Reset Form"
        message="Are you sure you want to reset? This match has not yet been saved."
        confirmText="Reset"
        cancelText="Cancel"
      />

      {/* Success Snackbar */}
      <Snackbar
        open={showSuccessSnackbar}
        onClose={() => setShowSuccessSnackbar(false)}
        slots={{ transition: Slide }}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        autoHideDuration={3000}
      >
        <Alert
          onClose={() => setShowSuccessSnackbar(false)}
          severity="success"
          variant="filled"
        >
          Match successfully saved to match history
        </Alert>
      </Snackbar>
    </>
  );
}
