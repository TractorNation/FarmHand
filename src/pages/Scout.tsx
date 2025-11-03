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
import Section from "../UI/Section";
import { useSchema } from "../context/SchemaContext";
import { useScoutData } from "../context/ScoutDataContext";
import { useEffect, useState, Key } from "react";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlineRounded";
import QRcodeIcon from "@mui/icons-material/QrcodeRounded";
import ResetIcon from "@mui/icons-material/ReplayRounded";
import HelpIcon from "@mui/icons-material/HelpOutlineRounded";

export default function Scout() {
  const { schema, schemaName } = useSchema();
  const theme = useTheme();
  const { errors, clearMatchData, setSubmitted, clearErrors } = useScoutData();

  const [resetKey, setResetKey] = useState<Key>(0);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [showResetPopup, setShowResetPopup] = useState(false);

  const handleSubmit = () => {
    setSubmitted(true);
    if (errors.length > 0) {
      setShowErrorPopup(true);
    }
  };

  const handleReset = async () => {
    await clearMatchData();
    clearErrors();
    setResetKey((prev) => (prev as number) + 1);
    setShowResetPopup(false);
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

  const schemaData = schema as Schema;

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
    </>
  );
}
