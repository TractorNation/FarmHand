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
import { useEffect, useState } from "react";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlineRounded";

export default function Scout() {
  const { schema, schemaName } = useSchema();
  const theme = useTheme();
  const { errors, clearMatchData, setSubmitted } = useScoutData();

  const [showErrorAlert, setShowErrorAlert] = useState(false);

  const handleSubmit = () => {
    setSubmitted(true);
    if (errors.length > 0) {
      setShowErrorAlert(true);
    }
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
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" sx={{ mb: 3 }}>
          Scouting - {schemaName}
        </Typography>
        <Stack spacing={3}>
          {schemaData.sections.map((section, index) => (
            <Section key={index} section={section} />
          ))}
        </Stack>
        <Button
          variant="contained"
          color="secondary"
          sx={{ mt: 3 }}
          onClick={handleSubmit}
        >
          Submit match
        </Button>
      </Box>
      <Dialog
        open={showErrorAlert}
        keepMounted
        onClose={() => setShowErrorAlert(false)}
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
          <Button onClick={() => setShowErrorAlert(false)} color="inherit">
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
