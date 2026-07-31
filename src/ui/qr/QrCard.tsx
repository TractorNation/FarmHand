import { Card, Stack, Typography, useTheme, Box } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircleRounded";
import useLongPress from "../../hooks/useLongPress";
import { useRef } from "react";
import { getDataFromQrName, getSchemaHashFromQrString } from "../../utils/QrUtils";
import { useSchema } from "../../context/SchemaContext";
import SchemaHashChip from "../SchemaHashChip";

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
  const { schemaNamesByHash } = useSchema();

  // Which schema produced this match. Read straight off the QR string so it stays
  // correct even for codes whose schema this device does not have.
  const schemaHash = getSchemaHashFromQrString(qr.data);

  // No preventDefault: this runs from a timer long after the pointer event was
  // dispatched. The follow-up click is suppressed by longPressTriggered below.
  const handleLongPress = () => {
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
    if (disabled) return;
    if (selecting) onSelect(qr);
    else onClickQr(qr);
  };

  const onLongPress = useLongPress(500, handleLongPress);

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
          <Box sx={{ minWidth: 0 }}>
            <SchemaHashChip
              hash={schemaHash}
              name={schemaHash ? schemaNamesByHash.get(schemaHash) : null}
            />
          </Box>
        </Stack>
      </Stack>
    </Card>
  );
}
