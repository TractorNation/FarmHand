import { Card, Grid, Typography, useTheme } from "@mui/material";

interface QrGridProps {
  validQrCodes: QrCode[];
  invalidQrCodes: QrCode[];
  selecting: boolean;
  codeIsSelected: (c: QrCode) => boolean;
  onSelect: (c: QrCode) => void;
  onClickQr: (c: QrCode) => void;
}

export default function QrGrid({
  validQrCodes,
  invalidQrCodes,
  selecting,
  codeIsSelected,
  onSelect,
  onClickQr,
}: QrGridProps) {
  const theme = useTheme();

  const renderCard = (qr: QrCode, disabled = false) => (
    <Card
      elevation={disabled ? 1 : 2}
      onClick={() =>
        selecting && !disabled ? onSelect(qr) : !disabled && onClickQr(qr)
      }
      sx={{
        p: 2,
        borderRadius: 2,
        cursor: disabled ? "default" : "pointer",
        border: `1px solid ${
          codeIsSelected(qr) && selecting
            ? theme.palette.info.main
            : theme.palette.divider
        }`,
        opacity: disabled ? 0.5 : 1,
        transition: "all 0.2s ease",
      }}
    >
      <img
        src={`data:image/svg+xml,${encodeURIComponent(qr.image)}`}
        alt="QR Code"
        style={{
          borderRadius: 8,
          width: "100%",
          aspectRatio: "1/1",
          objectFit: "contain",
        }}
      />
      <Typography>{qr.name}</Typography>
    </Card>
  );

  return (
    <>
      <Grid container spacing={2}>
        {validQrCodes.map((qr, i) => (
          <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }} key={i}>
            {renderCard(qr)}
          </Grid>
        ))}
      </Grid>

      {selecting && invalidQrCodes.length > 0 && (
        <>
          <Typography
            variant="h6"
            sx={{ mt: 4, mb: 2, color: "text.secondary" }}
          >
            Incompatible Codes
          </Typography>
          <Grid container spacing={2}>
            {invalidQrCodes.map((qr, i) => (
              <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }} key={i}>
                {renderCard(qr, true)}
              </Grid>
            ))}
          </Grid>
        </>
      )}
    </>
  );
}
