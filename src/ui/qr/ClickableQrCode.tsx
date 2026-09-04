import {
  Box,
  ButtonBase,
  Dialog,
  DialogContent,
  IconButton,
} from "@mui/material";
import useDialog from "../../hooks/useDialog";
import CloseIcon from "@mui/icons-material/CloseRounded";

interface QrCodeProps {
  data: string;
}

export default function QrCode(qrCodeProps: QrCodeProps) {
  const { data } = qrCodeProps;
  const [enlargedQrDialogOpen, openEnlargedQrDialog, closeEnlargedQrDialog] =
    useDialog();
  const imageSource = `data:image/svg+xml;base64,${btoa(data)}`;

  return (
    <>
      <ButtonBase
        component="div"
        onClick={openEnlargedQrDialog}
        aria-label={"Enlarge QR Code" }
        sx={{
          display: "block",
          cursor: "pointer",
          borderRadius: 1,
        }}
      >
        <img
          src={imageSource}
          alt="QR Code"
          style={{ width: 256, height: 256, display: "block", borderRadius: 8 }}
        />
      </ButtonBase>

      <Dialog
        open={enlargedQrDialogOpen}
        onClose={closeEnlargedQrDialog}
        fullScreen
        aria-label="Enlarged QR Code"
        slotProps={{
          paper: {
            sx: {
              m: 0,
              width: "100%",
              bgcolor: "background.default",
              position: "relative",
            },
          },
        }}
      >
        <IconButton
          onClick={closeEnlargedQrDialog}
          sx={{
            position: "absolute",
            top: "max(8px, env(safe-area-inset-top))",
            right: "max(8px, env(safe-area-inset-right))",
            zIndex: 1,
            bgcolor: "background.paper",
          }}
        >
          <CloseIcon />
        </IconButton>
        <DialogContent
          sx={{
            p: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "none",
          }}
        >
          <Box
            component="img"
            src={imageSource}
            alt="QR Code"
            sx={{
              borderRadius: 8,
              width: "auto",
              height: "100vh",
              maxHeight: "100%",
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
