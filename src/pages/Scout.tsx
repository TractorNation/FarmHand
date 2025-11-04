import {
  AppBar,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  ListItem,
  Slide,
  Snackbar,
  Stack,
  Toolbar,
  Typography,
  useTheme,
} from "@mui/material";
import Section from "../UI/Section";
import { useSchema } from "../context/SchemaContext";
import { useScoutData } from "../context/ScoutDataContext";
import { useEffect, useState, Key, useRef } from "react";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlineRounded";
import QRcodeIcon from "@mui/icons-material/QrcodeRounded";
import ResetIcon from "@mui/icons-material/ReplayRounded";
import HelpIcon from "@mui/icons-material/HelpOutlineRounded";
import CloseIcon from "@mui/icons-material/CloseRounded";
import CopyIcon from "@mui/icons-material/ContentCopyRounded";
import DownloadIcon from "@mui/icons-material/DownloadRounded";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { invoke } from "@tauri-apps/api/core";

export default function Scout() {
  const { schema, schemaName } = useSchema();
  const theme = useTheme();
  const { errors, clearMatchData, setSubmitted, clearErrors, getMatchData } =
    useScoutData();

  const [resetKey, setResetKey] = useState<Key>(0);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [showResetPopup, setShowResetPopup] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [showQRPage, setShowQRPage] = useState(false);
  const qrCodeData = useRef<QrCode | null>(null);

  const schemaData = schema as Schema;

  const handleSubmit = () => {
    setSubmitted(true);
    if (errors.length > 0) {
      setShowErrorPopup(true);
      return;
    }

    handleGenerateQr();
  };

  const handleReset = async () => {
    await clearMatchData();
    clearErrors();
    setResetKey((prev) => (prev as number) + 1);
    setShowResetPopup(false);
  };

  const handleGenerateQr = async () => {
    const sections = schemaData.sections;
    const keys = [];
    for (const section of sections) {
      for (const field of section.fields) {
        keys.push(field.name);
      }
    }

    const values = [];
    for (const key of keys) {
      values.push(await getMatchData(key));
    }

    const valueString = values.join(" ");

    const qrSvg = await invoke<string>("generate_qr_code", {
      data: valueString,
    });
    qrCodeData.current = { data: valueString, image: qrSvg };
    setShowQRPage(true);
  };

  const handleCopy = async () => {
    setSnackbarOpen(true);
    await writeText(qrCodeData.current?.data!);
  };

  useEffect(() => {
    clearMatchData();
  }, []);

  if (!schema) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="80vh"
      >
        <CircularProgress />
      </Box>
    );
  }
  return (
    <>
      <Box sx={{ p: 3, justifyContent: "center" }}>
        <Typography variant="h4" sx={{ mb: 3 }}>
          Scouting - {schemaName}
        </Typography>
        <Stack spacing={3} key={resetKey}>
          {schemaData.sections.map((section, index) => (
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
            color="inherit"
            sx={{ mt: 3 }}
            onClick={() => setShowResetPopup(true)}
          >
            <ResetIcon sx={{ mr: 1 }} />
            Reset form
          </Button>
          <Button
            variant="contained"
            color="secondary"
            sx={{ mt: 3 }}
            onClick={handleSubmit}
          >
            <QRcodeIcon sx={{ mr: 1 }} />
            Complete scout
          </Button>
        </Stack>
      </Box>

      {/*Page reload confirmation popup*/}
      <Dialog open={showResetPopup} onClose={() => setShowResetPopup(false)}>
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
          <Button
            onClick={() => setShowResetPopup(false)}
            color="primary"
            variant="outlined"
          >
            Cancel
          </Button>
          <Button onClick={handleReset} color="error" variant="outlined">
            Reset
          </Button>
        </DialogActions>
      </Dialog>

      {/* Form error popup */}
      <Dialog open={showErrorPopup} onClose={() => setShowErrorPopup(false)}>
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
          <Button onClick={() => setShowErrorPopup(false)} color="inherit">
            OK
          </Button>
        </DialogActions>
      </Dialog>

      {/*Full page QR export popup */}
      <Dialog fullScreen open={showQRPage} onClose={() => setShowQRPage(false)}>
        <AppBar
          sx={{
            position: "relative",
            backgroundColor: theme.palette.primary.main,
          }}
        >
          <Toolbar>
            <IconButton
              edge="start"
              color="inherit"
              onClick={() => setShowQRPage(false)}
              aria-label="close"
            >
              <CloseIcon />
            </IconButton>
            <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
              Export match data
            </Typography>
            <Button
              autoFocus
              color="inherit"
              variant="contained"
              sx={{ backgroundColor: theme.palette.primary.dark }}
              onClick={() => setShowQRPage(false)}
            >
              Save to match history
            </Button>
          </Toolbar>
        </AppBar>
        <DialogContent
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: theme.palette.background.paper,
          }}
        >
          <Stack direction={"column"} height={"100%"} spacing={3}>
            <Typography variant="subtitle1">
              Scan to import this match to another device
            </Typography>
            {qrCodeData.current ? (
              <img
                src={`data:image/svg+xml;base64,${btoa(qrCodeData.current.image)}`}
                alt="QR Code"
                style={{ borderRadius: 20 }}
              />
            ) : (
              <Typography
                variant="subtitle1"
                sx={{ mt: 2, mb: 1, color: theme.palette.error.main }}
              >
                Failed to load QR code.
              </Typography>
            )}
            <Stack
              direction={"row"}
              width={"100%"}
              justifyContent={"space-evenly"}
            >
              <Button
                variant="contained"
                color="secondary"
                onClick={handleCopy}
              >
                <CopyIcon sx={{ mr: 1 }} /> copy
              </Button>
              <Button variant="contained" color="secondary">
                <DownloadIcon sx={{ mr: 1 }} />
                download
              </Button>
            </Stack>
          </Stack>
        </DialogContent>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        onClose={() => setSnackbarOpen(false)}
        slots={{ transition: Slide }}
        slotProps={{
          content: {
            sx: {
              backgroundColor: theme.palette.success.main,
              color: theme.palette.success.contrastText,
              fontFamily: theme.typography.subtitle1,
            },
          },
        }}
        message="Form data copied to clipboard"
        autoHideDuration={1200}
        action={
          <IconButton
            onClick={() => {
              setSnackbarOpen(false);
            }}
          >
            <CloseIcon />
          </IconButton>
        }
      />
    </>
  );
}
