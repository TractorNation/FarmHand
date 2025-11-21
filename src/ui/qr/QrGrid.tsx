import { Box, Grid, Typography } from "@mui/material";
import QrCard from "./QrCard";

interface QrGridProps {
  validQrCodes: QrCode[];
  invalidQrCodes: QrCode[];
  selecting: boolean;
  codeIsSelected: (c: QrCode) => boolean;
  onSelect: (c: QrCode) => void;
  onClickQr: (c: QrCode) => void;
  toggleSelectMode?: () => void;
  filter: FilterOption[];
  sortMode: string;
  sortDirection: string;
}

export default function QrGrid(props: QrGridProps) {
  const {
    validQrCodes,
    invalidQrCodes,
    selecting,
    codeIsSelected,
    onSelect,
    onClickQr,
    toggleSelectMode,
  } = props;

  return (
    <Box>
      {/* Prevent clicks inside the grid from triggering the Box's onClick */}
      <Box onClick={(e) => e.stopPropagation()}>
        <Grid container spacing={2}>
          {validQrCodes.map((qr, i) => (
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={i}>
              <QrCard
                qr={qr}
                selecting={selecting}
                toggleSelectMode={toggleSelectMode}
                onSelect={onSelect}
                onClickQr={onClickQr}
                codeIsSelected={codeIsSelected}
              />
            </Grid>
          ))}
        </Grid>
      </Box>

      {selecting && invalidQrCodes.length > 0 && (
        <>
          <Box onClick={(e) => e.stopPropagation()}>
            <Typography
              variant="h6"
              sx={{ mt: 4, mb: 2, color: "text.secondary" }}
            >
              Incompatible Codes
            </Typography>
            <Grid container spacing={2}>
              {invalidQrCodes.map((qr, i) => (
                <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }} key={i}>
                  <QrCard
                    qr={qr}
                    selecting={selecting}
                    toggleSelectMode={toggleSelectMode}
                    onSelect={onSelect}
                    onClickQr={onClickQr}
                    codeIsSelected={codeIsSelected}
                    disabled
                  />
                </Grid>
              ))}
            </Grid>
          </Box>
        </>
      )}
    </Box>
  );
}
