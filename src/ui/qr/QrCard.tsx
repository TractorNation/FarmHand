import { Card, Stack, Typography, useTheme, Box } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircleRounded";
import useLongPress from "../../hooks/useLongPress";
import { useRef } from "react";
import { getDataFromQrName } from "../../utils/QrUtils";

interface QrCardProps {
  qr: QrCode;
  disabled?: boolean;
  selecting: boolean;
  toggleSelectMode?: () => void;
  onSelect: (qr: QrCode) => void;
  onClickQr: (qr: QrCode) => void;
  codeIsSelected: (qr: QrCode) => boolean;
}

export default function QrCard(props: QrCardProps) {
  const { qr, disabled, selecting, toggleSelectMode, onSelect, onClickQr, codeIsSelected } =
    props;
  const theme = useTheme();
  const longPressTriggered = useRef(false);

  const handleLongPress = (e: TouchEvent | MouseEvent) => {
    e.preventDefault();
    if (toggleSelectMode && !disabled) {
      longPressTriggered.current = true;
      if (!selecting) {
        toggleSelectMode();
      }
      onSelect(qr);
    }
  };

  const handleClick = () => {
    if (longPressTriggered.current) {
      longPressTriggered.current = false;
      return;
    }
    selecting && !disabled ? onSelect(qr) : !disabled && onClickQr(qr);
  };

  const onLongPress = useLongPress(
    500,
    handleLongPress as (e: TouchEvent) => void,
    handleLongPress as (e: MouseEvent) => void
  );

  return (
    <Card
      {...onLongPress}
      elevation={disabled ? 1 : 2}
      onClick={handleClick}
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
      <Stack direction={"row"} spacing={2} alignItems={"center"}>
        <Box
          sx={{
            position: "relative",
            flexShrink: 0,
            width: "clamp(60px, 30%, 100px)",
            height: "clamp(60px, 30%, 100px)",
          }}
        >
          <img
            src={`data:image/svg+xml,${encodeURIComponent(qr.image)}`}
            alt={`Team: ${getDataFromQrName(qr.name).TeamNumber}, Match: ${
              getDataFromQrName(qr.name).MatchNumber
            }`}
            style={{
              borderRadius: 8,
              width: "100%",
              height: "100%",
              objectFit: "contain",
              opacity: qr.scanned ? 0.6 : 1,
              transition: "opacity 0.2s ease",
              display: "block",
            }}
          />
          {qr.scanned && (
            <CheckCircleIcon
              sx={{
                position: "absolute",
                top: -6,
                right: -6,
                fontSize: 28,
                color: theme.palette.success.main,
                backgroundColor: theme.palette.background.paper,
                borderRadius: "50%",
                boxShadow: `0 2px 4px ${theme.palette.mode === "dark" ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.2)"}`,
                pointerEvents: "none",
                zIndex: 1,
              }}
            />
          )}
        </Box>
        <Stack direction={"column"} spacing={0.5} sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="subtitle1" noWrap>
            Team: {getDataFromQrName(qr.name).TeamNumber}
          </Typography>
          <Typography variant="subtitle1" noWrap>
            Match: {getDataFromQrName(qr.name).MatchNumber}
          </Typography>
        </Stack>
      </Stack>
    </Card>
  );
}
