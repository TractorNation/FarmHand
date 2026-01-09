import { Card, Stack, Typography, useTheme, Box } from "@mui/material";
import FolderIcon from "@mui/icons-material/FolderRounded";
import useLongPress from "../../hooks/useLongPress";
import { useRef } from "react";

interface FolderCardProps {
  folder: QrFolder;
  onClickFolder: (folderId: string) => void;
  selecting: boolean;
  onSelect: (folder: QrFolder) => void;
  isSelected: boolean;
  toggleSelectMode?: () => void;
}

export default function FolderCard(props: FolderCardProps) {
  const {
    folder,
    onClickFolder,
    selecting,
    onSelect,
    isSelected,
    toggleSelectMode,
  } = props;

  const theme = useTheme();
  const longPressTriggered = useRef(false);

  const handleLongPress = (e: TouchEvent | MouseEvent) => {
    e.preventDefault();
    if (toggleSelectMode) {
      longPressTriggered.current = true;
      if (!selecting) {
        toggleSelectMode();
      }
      onSelect(folder);
    }
  };

  const handleClick = () => {
    if (longPressTriggered.current) {
      longPressTriggered.current = false;
      return;
    }
    selecting ? onSelect(folder) : onClickFolder(folder.id);
  };

  const onLongPress = useLongPress(
    500,
    handleLongPress as (e: TouchEvent) => void,
    handleLongPress as (e: MouseEvent) => void
  );

  return (
    <Card
      {...onLongPress}
      onClick={handleClick}
      sx={{
        p: 2,
        borderRadius: 2,
        border: `1px solid ${
          isSelected && selecting
            ? theme.palette.info.main
            : theme.palette.divider
        }`,
        transition: "all 0.2s ease",
      }}
    >
      <Stack direction="row" spacing={2} alignItems="center">
        <FolderIcon sx={{ fontSize: 60 }} />
        <Box>
          <Typography variant="subtitle1">{folder.name}</Typography>
          <Typography variant="caption">
            {folder.qrCodes.length} codes
          </Typography>
        </Box>
      </Stack>
    </Card>
  );
}
  