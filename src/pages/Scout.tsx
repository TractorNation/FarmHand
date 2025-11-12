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
  Paper,
} from "@mui/material";
import Section from "../ui/Section";
import { useSchema } from "../context/SchemaContext";
import { useScoutData } from "../context/ScoutDataContext";
import { useState, Key, useRef } from "react";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlineRounded";
import ResetIcon from "@mui/icons-material/ReplayRounded";
import HelpIcon from "@mui/icons-material/HelpOutlineRounded";
import QrCodeIcon from "@mui/icons-material/QrCodeRounded";
import AssignmentIcon from "@mui/icons-material/AssignmentRounded";

import QrShareDialog from "../ui/dialog/QrShareDialogue";
import useDialog from "../hooks/useDialog";
import { QrCodeBuilder, saveQrCode } from "../utils/QrUtils";
import { getFieldValueByName } from "../utils/GeneralUtils";

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

  const [resetKey, setResetKey] = useState<Key>(0);
  const [showErrorPopup, openErrorPopup, closeErrorPopup] = useDialog();
  const [showResetPopup, openResetPopup, closeResetPopup] = useDialog();
  const [showQrPopup, openQrPopup, closeQrPopup] = useDialog();
  const qrCodeData = useRef<QrCode | null>(null);

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
    const qr = await QrCodeBuilder.build.MATCH(schemaHash, minifiedJSON, [
      teamNumber!,
      matchNumber!,
    ]);
    qrCodeData.current = qr;
    openQrPopup();
  };

  const handleSaveQR = async () => {
    if (!qrCodeData.current) return;

    await saveQrCode(qrCodeData.current);

    closeQrPopup();
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
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 3,
            borderRadius: 3,
            background: `linear-gradient(135deg, ${theme.palette.primary.main}15 0%, ${theme.palette.primary.main}05 100%)`,
            border: `1px solid ${theme.palette.primary.main}40`,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: `${theme.palette.primary.main}20`,
                color: theme.palette.primary.main,
              }}
            >
              <AssignmentIcon sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 600 }}>
                {schemaName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Fill out the form to scout a match
              </Typography>
            </Box>
          </Stack>
        </Paper>

        <Stack spacing={3} key={resetKey}>
          {schemaData!.sections.map((section, index) => (
            <Section key={index} section={section} submitted={submitted} />
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
        sx={{ elevation: 24 }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
          }}
        >
          <HelpIcon sx={{ mr: 1 }} />
          Are you sure you want to reset the form?
        </DialogTitle>
        <DialogActions>
          <Button onClick={closeResetPopup} color="primary" variant="text">
            Cancel
          </Button>
          <Button onClick={handleReset} color="error" variant="contained">
            Reset
          </Button>
        </DialogActions>
      </Dialog>

      {/* Form error popup */}
      <Dialog
        open={showErrorPopup}
        onClose={closeErrorPopup}
        sx={{
          elevation: 24,
          "& .MuiDialog-paper": {
            backgroundColor: theme.palette.background.paper,
            backgroundImage: "none",
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            color: theme.palette.error.main,
            backgroundColor: theme.palette.background.paper,
          }}
        >
          <ErrorOutlineIcon sx={{ mr: 1 }} />
          Errors
        </DialogTitle>
        <DialogContent
          sx={{
            backgroundColor: theme.palette.background.paper,
            borderColor: theme.palette.divider,
          }}
        >
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
                  border: `1px solid ${theme.palette.error.main}`,
                  borderRadius: 1,
                  backgroundColor: theme.palette.background.paper,
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
        <DialogActions
          sx={{
            backgroundColor: theme.palette.background.paper,
          }}
        >
          <Button onClick={closeErrorPopup} color="inherit">
            OK
          </Button>
        </DialogActions>
      </Dialog>

      {/*QR export popup */}
      <QrShareDialog
        open={showQrPopup}
        onClose={closeQrPopup}
        qrCodeData={qrCodeData.current!}
        handleSaveQR={handleSaveQR}
      />
    </>
  );
}