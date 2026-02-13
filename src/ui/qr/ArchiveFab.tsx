import { Box, Fab, Zoom } from "@mui/material";
import SendIcon from "@mui/icons-material/SendRounded";

interface Props {
  selecting: boolean;
  disabled: boolean;
  onSendTo: () => void;
}

export default function ArchiveFab({
  selecting,
  disabled,
  onSendTo,
}: Props) {
  const fabStyle = {
    position: "fixed",
    bottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
    left: "calc(16px + env(safe-area-inset-left, 0px))",
  };

  return (
    <Box sx={{ zIndex: 1000 }}>
      <Zoom in={selecting} unmountOnExit>
        <Fab
          color="primary"
          variant="extended"
          size="large"
          disabled={disabled}
          onClick={onSendTo}
          sx={fabStyle}
        >
          <SendIcon sx={{ mr: 1 }} /> Send to
        </Fab>
      </Zoom>
    </Box>
  );
}
