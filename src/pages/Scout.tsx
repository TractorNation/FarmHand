import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import Section from "../ui/Section";
import { useSchema } from "../context/SchemaContext";
import { useScoutData } from "../context/ScoutDataContext";
import { useState, Key, useRef, useCallback } from "react";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlineRounded";
import ResetIcon from "@mui/icons-material/ReplayRounded";
import HelpIcon from "@mui/icons-material/HelpOutlineRounded";
import QrCodeIcon from "@mui/icons-material/QrCodeRounded";
import AddChartIcon from "@mui/icons-material/AddchartRounded";

import useDialog from "../hooks/useDialog";
import { QrCodeBuilder, saveQrCode } from "../utils/QrUtils";
import { getFieldValueByName } from "../utils/GeneralUtils";
import PageHeader from "../ui/PageHeader";
import { useSettings } from "../context/SettingsContext";
import ShareDialog from "../ui/dialog/ShareDialog";

export default function Scout() {
  const { schema, hash, schemaName } = useSchema();
  const theme = useTheme();
  const {
    errors,
    clearMatchData,
    setSubmitted,
    submitted,
    clearErrors,
    getMatchDataMap,
  } = useScoutData();
  const { settings } = useSettings();
  const [resetKey, setResetKey] = useState<Key>(0);
  const [showErrorPopup, openErrorPopup, closeErrorPopup] = useDialog();
  const [showResetPopup, openResetPopup, closeResetPopup] = useDialog();
  const [showQrPopup, openQrPopup, closeQrPopup] = useDialog();
  const qrCodeData = useRef<QrCode | null>(null);
  const [expandedSectionIndex, setExpandedSectionIndex] = useState<
    number | false
  >(0);

  const deviceID = settings.DEVICE_ID;

  const handleSectionToggle = useCallback(
    (panelIndex: number) => (isExpanded: boolean) => {
      if (isExpanded) {
        // Only update if the state is actually different
        setExpandedSectionIndex((prev) => {
          if (prev === panelIndex) return prev;
          return panelIndex;
        });
      } else {
        // If the current panel is being closed, open the next one
        // Only do this if the current panel is actually expanded
        setExpandedSectionIndex((prev) => {
          if (prev !== panelIndex) return prev; // Panel wasn't expanded, no change needed
          const totalSections = schema!.sections.length;
          const nextIndex = (panelIndex + 1) % totalSections;
          return nextIndex;
        });
      }
    },
    [schema]
  );

  const handleSaveQr = async (code: QrCode) => {
    await saveQrCode(code);

    closeQrPopup();
  };

  const schemaData = schema;

  const handleSubmit = () => {
    setSubmitted(true);
    if (errors.length > 0) {
      openErrorPopup();
      return;
    }

    handleGenerateQr();
  };

  const handleReset = async () => {
    await clearMatchData();
    clearErrors();
    setResetKey((prev) => (prev as number) + 1);
    closeResetPopup();
  };

  const handleGenerateQr = async () => {
    const matchData = getMatchDataMap();
    const schemaHash = hash ?? "000000";

    const allFields = schema!.sections.flatMap((section) => section.fields);
    const minifiedJSON = allFields.map((field) => matchData.get(field.id));

    const teamNumber = getFieldValueByName("Team Number", schema!, matchData);
    const matchNumber = getFieldValueByName("Match Number", schema!, matchData);
    const qr = await QrCodeBuilder.build.MATCH(
      schemaHash,
      minifiedJSON,
      [teamNumber!, matchNumber!],
      deviceID
    );
    qrCodeData.current = qr;
    openQrPopup();
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
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <PageHeader
          icon={<AddChartIcon sx={{ fontSize: 28 }} />}
          title={schemaName ?? "Scout Match"}
          subtitle="Fill out the form to record match data"
        />

        <Stack spacing={3} key={resetKey}>
          {schemaData!.sections.map((section, index) => (
            <Section
              key={index}
              section={section}
              submitted={submitted}
              expanded={expandedSectionIndex === index}
              onToggle={handleSectionToggle(index)}
            />
          ))}
        </Stack>

        <Stack
          direction={"row"}
          spacing={2}
          width={"100%"}
          justifyContent={"space-between"}
          sx={{ mt: 3 }}
        >
          <Button
            variant="outlined"
            color="warning"
            size="large"
            sx={{
              borderRadius: 2,
              borderWidth: 2,
              "&:hover": {
                borderWidth: 2,
              },
            }}
            onClick={openResetPopup}
            startIcon={<ResetIcon />}
          >
            Reset form
          </Button>
          <Button
            variant="contained"
            color="primary"
            size="large"
            sx={{
              borderRadius: 2,
              px: 4,
            }}
            onClick={handleSubmit}
            startIcon={<QrCodeIcon />}
          >
            Complete scout
          </Button>
        </Stack>
      </Box>

      {/*Page reload confirmation popup*/}
      <Dialog
        open={showResetPopup}
        onClose={closeResetPopup}
        slotProps={{ paper: { sx: { borderRadius: 3, minWidth: 400 } } }}
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

      {/* Form error popup */}
      <Dialog
        open={showErrorPopup}
        onClose={closeErrorPopup}
        slotProps={{
          paper: {
            sx: {
              borderRadius: 3,
              minWidth: 400,
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            color: theme.palette.error.main,
            fontWeight: 600,
          }}
        >
          <ErrorOutlineIcon sx={{ mr: 1 }} color="error" />
          Form Errors
        </DialogTitle>
        <DialogContent>
          <DialogContentText
            variant="body1"
            sx={{
              mb: 2,
              color: theme.palette.text.secondary,
            }}
          >
            The following fields have errors that must be addressed before
            submission:
          </DialogContentText>
          <Stack spacing={1.5}>
            {errors.map((error, index) => (
              <Box
                key={index}
                sx={{
                  p: 2,
                  border: `2px solid ${theme.palette.error.main}`,
                  borderRadius: 2,
                  backgroundColor: `${theme.palette.error.main}10`,
                }}
              >
                <Typography
                  sx={{
                    color: theme.palette.error.main,
                    fontWeight: 500,
                  }}
                  variant="subtitle2"
                >
                  {error}
                </Typography>
              </Box>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={closeErrorPopup}
            variant="contained"
            sx={{ borderRadius: 2 }}
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>

      {/*QR export popup */}
      <ShareDialog
        mode="match"
        open={showQrPopup}
        onClose={closeQrPopup}
        onSave={handleSaveQr}
        qrCodeData={qrCodeData.current!}
      />
    </>
  );
}
