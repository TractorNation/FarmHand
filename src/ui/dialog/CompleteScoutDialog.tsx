import {
  Dialog,
  DialogContent,
  Typography,
  Button,
  useTheme,
  useMediaQuery,
  Box,
  DialogTitle,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircleRounded";
import CloseIcon from "@mui/icons-material/CloseRounded";
import { saveQrCode } from "../../utils/QrUtils";
import MatchDataReview from "../scout/MatchDataReview";

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

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
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
            flexShrink: 1, // Changed from 0 to 1
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
            minWidth: isLandscape ? "100px" : "100%", // Reduced from 300px
            maxWidth: isLandscape ? "30%" : "100%", // Added max width constraint
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
                width: "100%", // Changed from fixed values
                maxWidth: isLandscape ? "250px" : "400px", // Responsive max width
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
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Match Data Overview
          </Typography>
          <MatchDataReview schema={schema} values={matchData} />
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
