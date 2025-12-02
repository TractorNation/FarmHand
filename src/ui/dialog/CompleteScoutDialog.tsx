import {
  Dialog,
  DialogContent,
  Stack,
  Typography,
  Button,
  useTheme,
  useMediaQuery,
  Box,
  DialogTitle,
  Paper,
  Divider,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircleRounded";
import CloseIcon from "@mui/icons-material/CloseRounded";
import { saveQrCode } from "../../utils/QrUtils";

interface CompleteScoutDialogProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
  qrCode: QrCode;
  schema: Schema;
  matchData: Map<number, any>;
  autosave: boolean;
}

export default function CompleteScoutDialog({
  open,
  onClose,
  onComplete,
  qrCode,
  schema,
  matchData,
  autosave,
}: CompleteScoutDialogProps) {
  const theme = useTheme();
  const isLandscape = useMediaQuery("(orientation: landscape)");

  const handleComplete = async () => {
    if (autosave) {
      await saveQrCode(qrCode);
    }
    onComplete();
  };

  // Format value for display
  const formatValue = (value: any, fieldType: string): string => {
    if (value === undefined || value === null || value === "") {
      return "—";
    }

    if (fieldType === "checkbox") {
      return value ? "Yes" : "No";
    }

    if (fieldType === "grid") {
      if (typeof value === "string" && value.includes(":")) {
        const parts = value.split(":");
        if (parts.length > 1) {
          const checked = parts[1];
          if (checked === "[]") return "None selected";
          const count = checked.split(",").filter((v) => v.trim()).length;
          return `${count} cell${count !== 1 ? "s" : ""} selected`;
        }
      }
      return String(value);
    }

    if (fieldType === "timer") {
      return String(value);
    }

    return String(value);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth={isLandscape ? "lg" : "md"}
      slotProps={{
        paper: {
          elevation: 24,
          sx: {
            borderRadius: 3,
            overflow: "hidden",
            backgroundColor: theme.palette.background.paper,
            maxHeight: "90dvh",
            display: "flex",
            flexDirection: "column",
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          fontWeight: 600,
          pb: 1,
        }}
      >
        Complete Scout
      </DialogTitle>
      <DialogContent
        sx={{
          display: "flex",
          flexDirection: isLandscape ? "row" : "column",
          gap: 3,
          overflow: "auto",
          flex: 1,
        }}
      >
        {/* QR Code Section */}
        <Box
          sx={{
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
            minWidth: isLandscape ? "300px" : "100%",
          }}
        >
          <Box
            sx={{
              borderRadius: 3,
              overflow: "hidden",
              border: `2px solid ${theme.palette.divider}`,
              boxShadow: `0 4px 12px ${theme.palette.primary.main}15`,
              position: "relative",
            }}
          >
            <img
              src={`data:image/svg+xml;base64,${btoa(qrCode.image)}`}
              alt="QR Code"
              style={{
                width: isLandscape ? "300px" : "100%",
                maxWidth: "400px",
                display: "block",
              }}
            />
          </Box>
          <Typography
            variant="body2"
            color="text.secondary"
            textAlign="center"
            sx={{ maxWidth: "300px" }}
          >
            {qrCode.name}
          </Typography>
        </Box>

        {/* Data Overview Section */}
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            overflow: "auto",
          }}
        >
          <Typography
            variant="h6"
            sx={{ fontWeight: 600, mb: 2 }}
          >
            Match Data Overview
          </Typography>
          <Stack spacing={2}>
            {schema.sections.map((section, sectionIndex) => {
              // Show all fields in this section, even if they don't have values
              return (
                <Paper
                  key={sectionIndex}
                  elevation={0}
                  sx={{
                    p: 2,
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 2,
                    backgroundColor: theme.palette.background.default,
                  }}
                >
                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: 600, mb: 1.5 }}
                    color="primary"
                  >
                    {section.title}
                  </Typography>
                  <Stack spacing={1.5}>
                    {section.fields.map((field, fieldIndex) => {
                      const value = matchData.get(field.id);
                      return (
                        <Box key={field.id}>
                          <Stack
                            direction="row"
                            spacing={2}
                            sx={{ alignItems: "flex-start" }}
                          >
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 500,
                                minWidth: "140px",
                                color: theme.palette.text.secondary,
                              }}
                            >
                              {field.name}:
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{
                                flex: 1,
                                wordBreak: "break-word",
                              }}
                            >
                              {formatValue(value, field.type)}
                            </Typography>
                          </Stack>
                          {fieldIndex < section.fields.length - 1 && (
                            <Divider sx={{ mt: 1.5 }} />
                          )}
                        </Box>
                      );
                    })}
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        </Box>
      </DialogContent>

      {/* Actions */}
      <Box
        sx={{
          p: 2,
          borderTop: `1px solid ${theme.palette.divider}`,
          display: "flex",
          gap: 2,
          justifyContent: "flex-end",
        }}
      >
        <Button
          variant="outlined"
          color="secondary"
          onClick={onClose}
          startIcon={<CloseIcon />}
          sx={{
            borderRadius: 2,
            borderWidth: 2,
            "&:hover": {
              borderWidth: 2,
            },
          }}
        >
          Close
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleComplete}
          startIcon={<CheckCircleIcon />}
          sx={{ borderRadius: 2, px: 3 }}
        >
          Complete Scout
        </Button>
      </Box>
    </Dialog>
  );
}

