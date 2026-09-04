import {
  Dialog,
  DialogContent,
  Typography,
  Button,
  useTheme,
  Box,
  DialogTitle,
  Stack,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircleRounded";
import CloseIcon from "@mui/icons-material/CloseRounded";
import TouchAppIcon from "@mui/icons-material/TouchAppRounded";
import { saveQrCode } from "../../utils/QrUtils";
import QrCode from "../qr/ClickableQrCode";

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
  autosave,
}: CompleteScoutDialogProps) {
  const theme = useTheme();

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
          pb: 0.5,
          textAlign: "center",
        }}
      >
        Complete Scout
      </DialogTitle>
      <DialogContent sx={{ pt: 0, pb: 3 }}>
        <Stack spacing={2.5} alignItems="center">
          {/* The card keeps the QR visually separate from the dialog chrome. */}
          <Box
            sx={{
              width: "min(100%, 340px)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <QrCode
              data={qrCode.image}
            />
          </Box>
          <Typography
            variant="body2"
            color="text.primary"
            textAlign="center"
            sx={{ fontWeight: 600, overflowWrap: "anywhere" }}
          >
            {qrCode.name}
          </Typography>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              color: "text.secondary",
            }}
          >
            <TouchAppIcon fontSize="small" />
            <Typography variant="body2" textAlign="center">
              Tap the QR code to enlarge it for scanning
            </Typography>
          </Box>
        </Stack>
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
