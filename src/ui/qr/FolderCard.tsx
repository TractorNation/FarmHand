import { Card, Stack, Typography, Box, useTheme } from "@mui/material";
import FolderIcon from "@mui/icons-material/FolderRounded";

interface FolderCardProps {
  folder: QrFolder;
  onClickFolder: (folderId: string) => void;
  selecting: boolean;
  onSelect: (folder: QrFolder) => void;
  isSelected: boolean;
}

export default function FolderCard(props: FolderCardProps) {
  const { folder, onClickFolder, selecting, onSelect, isSelected } = props;
  const theme = useTheme();

  return (
    <Card
      onClick={() => (selecting ? onSelect(folder) : onClickFolder(folder.id))}
      sx={{
        p: 2,
        cursor: "pointer",
        border: `1px solid ${
          isSelected && selecting
            ? theme.palette.info.main
            : theme.palette.divider
        }`,
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
