import { Box, Card, Fab, Grid, Typography, useTheme } from "@mui/material";
import QrScanIcon from "@mui/icons-material/QrCodeScannerRounded";
import { useState } from "react";
import {
  exists,
  BaseDirectory,
  readDir,
  readTextFile,
} from "@tauri-apps/plugin-fs";
import QrScannerPopup from "../ui/dialog/QrScannerPopup";
import QrShareDialog from "../ui/dialog/QrShareDialogue";
import useDialog from "../hooks/useDialog";
import { useAsyncFetch } from "../hooks/useAsyncFetch";
import { GetDescFromSvg } from "../utils/GeneralUtils";

const fetchQrCodes = async () => {
  const folderExists = await exists("saved-matches", {
    baseDir: BaseDirectory.AppLocalData,
  });

  if (!folderExists) {
    console.log("saved matches folder does not exist");
    return;
  }

  const files = await readDir("saved-matches", {
    baseDir: BaseDirectory.AppLocalData,
  });

  const images = await Promise.all(
    files
      .filter((file) => file.name.endsWith(".svg"))
      .map(async (file) => {
        const contents = await readTextFile(`saved-matches/${file.name}`, {
          baseDir: BaseDirectory.AppLocalData,
        });

        const data = GetDescFromSvg(contents);

        return {
          name: file.name,
          data: data,
          image: contents,
        };
      })
  );
  return images;
};

export default function QRPage() {
  const theme = useTheme();
  const [qrCodes, loadingQr, errorFetchingQr] = useAsyncFetch(fetchQrCodes);
  const [activeCode, setActiveCode] = useState<QrCode | null>(null);
  const [showQrPopup, openQrPopup, closeQrPopup] = useDialog();
  const [scannerOpen, openScanner, closeScanner] = useDialog();

  const selectImage = (image: QrCode) => {
    setActiveCode(image);
    openQrPopup();
  };

  if (loadingQr) {
    return (
      <Typography variant="h6" color="info">
        Loading...
      </Typography>
    );
  }

  if (errorFetchingQr) {
    return (
      <Typography variant="h6" color="error">
        Error fetching QR codes
      </Typography>
    );
  }

  return (
    <>
      <Fab
        color="secondary"
        size="large"
        variant="extended"
        sx={{ position: "fixed", bottom: 16, right: 16 }}
        onClick={openScanner}
      >
        <QrScanIcon sx={{ mr: 1 }} />
        Scan
      </Fab>
      <Box sx={{ px: 3, pt: 2, justifyContent: "center" }}>
        <Grid container spacing={2}>
          {qrCodes!.map((qr, i) => {
            console.log(qr);
            return (
              <Grid size={{ xs: 6, sm: 3, md: 2, lg: 1 }} key={i}>
                <Card
                  sx={{
                    borderColor: theme.palette.divider,
                    borderWidth: 2,
                    borderStyle: "solid",
                    borderRadius: 2,
                    p: 2,
                    maxWidth: "fit-content",
                    height: "100%",
                    backgroundColor: theme.palette.background.paper,
                    transition:
                      "border-color 0.2s ease, background-color 0.2s ease",
                    alignContent: "center",
                    ":hover": {
                      borderColor: theme.palette.primary.main,
                    },
                  }}
                  onClick={() => selectImage(qr)}
                >
                  <img
                    src={`data:image/svg+xml,${encodeURIComponent(qr.image)}`}
                    alt="QR Code"
                    style={{ borderRadius: 8, maxWidth: "100%" }}
                  />
                  <Typography>{qr.name}</Typography>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Box>
      <QrScannerPopup
        open={scannerOpen}
        onClose={closeScanner}
        onScanListUpdate={() => {}}
      />

      <QrShareDialog
        open={showQrPopup}
        onClose={closeQrPopup}
        qrCodeData={activeCode!}
      />
    </>
  );
}
