import {
  Card,
  Stack,
  Typography,
  useTheme,
  Box,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import FolderIcon from "@mui/icons-material/FolderRounded";
import EditIcon from "@mui/icons-material/EditRounded";
import DeleteIcon from "@mui/icons-material/DeleteRounded";
import ArchiveIcon from "@mui/icons-material/ArchiveRounded";
import UnarchiveIcon from "@mui/icons-material/UnarchiveRounded";
import useLongPress from "../../hooks/useLongPress";
import { useRef, useState } from "react";

interface FolderCardProps {
  folder: QrFolder;
  onClickFolder: (folderId: string) => void;
  selecting: boolean;
  onSelect: (folder: QrFolder) => void;
  isSelected: boolean;
  toggleSelectMode?: () => void;
  onRename?: (folder: QrFolder) => void;
  onDelete?: (folder: QrFolder) => void;
  onArchive?: (folder: QrFolder) => void;
  onUnarchive?: (folder: QrFolder) => void;
  isArchived?: boolean;
}

export default function FolderCard(props: FolderCardProps) {
  const {
    folder,
    onClickFolder,
    selecting,
    onSelect,
    isSelected,
    toggleSelectMode,
    onRename,
    onDelete,
    onArchive,
    onUnarchive,
    isArchived = false,
  } = props;

  const theme = useTheme();
  const longPressTriggered = useRef(false);
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
  } | null>(null);

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu(
      contextMenu === null
        ? {
            mouseX: event.clientX + 2,
            mouseY: event.clientY - 6,
          }
        : null
    );
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

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

  const handleRename = () => {
    handleCloseContextMenu();
    onRename?.(folder);
  };

  const handleDelete = () => {
    handleCloseContextMenu();
    onDelete?.(folder);
  };

  const handleArchive = () => {
    handleCloseContextMenu();
    onArchive?.(folder);
  };

  const handleUnarchive = () => {
    handleCloseContextMenu();
    onUnarchive?.(folder);
  };

  const onLongPress = useLongPress(
    500,
    handleLongPress as (e: TouchEvent) => void,
    handleLongPress as (e: MouseEvent) => void
  );

  return (
    <>
      <Card
        {...onLongPress}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        sx={{
          p: 2,
          borderRadius: 2,
          border: `1px solid ${
            isSelected && selecting
              ? theme.palette.info.main
              : theme.palette.divider
          }`,
          transition: "all 0.2s ease",
          cursor: "pointer",
          "&:hover": {
            borderColor: theme.palette.primary.main,
          },
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <FolderIcon
            sx={{
              fontSize: 60,
              color: isSelected && selecting
                ? theme.palette.info.main
                : theme.palette.primary.main,
            }}
          />
          <Box>
            <Typography variant="subtitle1" fontWeight={600}>
              {folder.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {folder.qrCodes.length} code{folder.qrCodes.length !== 1 ? "s" : ""}
            </Typography>
          </Box>
        </Stack>
      </Card>

      {/* Context Menu */}
      <Menu
        open={contextMenu !== null}
        onClose={handleCloseContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
        slotProps={{
          paper: {
            sx: {
              borderRadius: 2,
              minWidth: 180,
            },
          },
        }}
      >
        <MenuItem onClick={handleRename}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Rename</ListItemText>
        </MenuItem>
        {!isArchived && onArchive && (
          <MenuItem onClick={handleArchive}>
            <ListItemIcon>
              <ArchiveIcon fontSize="small" color="warning" />
            </ListItemIcon>
            <ListItemText>Archive</ListItemText>
          </MenuItem>
        )}
        {isArchived && onUnarchive && (
          <MenuItem onClick={handleUnarchive}>
            <ListItemIcon>
              <UnarchiveIcon fontSize="small" color="secondary" />
            </ListItemIcon>
            <ListItemText>Unarchive</ListItemText>
          </MenuItem>
        )}
        <MenuItem onClick={handleDelete}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText sx={{ color: theme.palette.error.main }}>
            Delete
          </ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}
