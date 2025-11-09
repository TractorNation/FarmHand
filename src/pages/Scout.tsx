import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  ListItem,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import Section from "../ui/Section";
import { useSchema } from "../context/SchemaContext";
import { useScoutData } from "../context/ScoutDataContext";
import { useState, Key, useRef } from "react";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlineRounded";
import ResetIcon from "@mui/icons-material/ReplayRounded";
import HelpIcon from "@mui/icons-material/HelpOutlineRounded";
import QrCodeIcon from "@mui/icons-material/QrCodeRounded";

import QrShareDialog from "../ui/dialog/QrShareDialogue";
import useDialog from "../hooks/useDialog";
import { QrCodeBuilder, saveQrCode } from "../utils/QrUtils";
import { getFieldValueByName } from "../utils/GeneralUtils";

export default function Scout() {
  const { schema, hash, schemaName } = useSchema();
  const theme = useTheme();
  const { errors, clearMatchData, setSubmitted, clearErrors, getMatchDataMap } =
    useScoutData();

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
    const minifiedJSON = Array.from(matchData.values());
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
      <Box sx={{ p: 3, justifyContent: "center" }}>
        <Typography variant="h3" sx={{ mb: 3 }}>
          {schemaName}
        </Typography>
        <Stack spacing={3} key={resetKey}>
          {schemaData!.sections.map((section, index) => (
            <Section key={index} section={section} />
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
            variant="contained"
            color="warning"
            sx={{ mt: 3 }}
            onClick={openResetPopup}
          >
            <ResetIcon sx={{ mr: 1 }} />
            Reset form
          </Button>
          <Button
            variant="contained"
            color="primary"
            sx={{ mt: 3 }}
            onClick={handleSubmit}
          >
            <QrCodeIcon sx={{ mr: 1 }} />
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
          <Button onClick={handleReset} color="error" variant="contained">
            Reset
          </Button>
          <Button onClick={closeResetPopup} color="primary" variant="text">
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Form error popup */}
      <Dialog
        open={showErrorPopup}
        onClose={closeErrorPopup}
        sx={{ elevation: 24 }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            color: theme.palette.error.main,
          }}
        >
          <ErrorOutlineIcon sx={{ mr: 1 }} />
          Errors
        </DialogTitle>
        <DialogContent dividers>
          <DialogContentText variant="body1" sx={{ mt: 2, mb: 1 }}>
            The following fields have errors that must be addressed before
            submission:
          </DialogContentText>
          {errors.map((error, index) => (
            <ListItem key={index}>
              <Typography sx={{ color: theme.palette.error.main }}>
                {error}
              </Typography>
            </ListItem>
          ))}
        </DialogContent>
        <DialogActions>
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
        allowSaveToHistory
      />
    </>
  );
}
