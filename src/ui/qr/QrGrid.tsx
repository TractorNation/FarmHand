import { Box, Divider, Grid, Stack, Tooltip, Typography } from "@mui/material";
import HelpIcon from "@mui/icons-material/HelpRounded";
import QrCard from "./QrCard";
import FolderCard from "./FolderCard";

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
  folders?: QrFolder[];
  onClickFolder?: (folderId: string) => void;
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
    folders,
    onClickFolder,
  } = props;

  folders?.map((folder) => {
    console.log("Folder in QrGrid:", folder);
  });

  return (
    <Box>
      {/* Prevent clicks inside the grid from triggering the Box's onClick */}
      <Box onClick={(e) => e.stopPropagation()}>
        <Grid container spacing={2}>
          {/* Render folders first */}
          {folders?.map((folder) => (
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={folder.id}>
              <FolderCard
                folder={folder}
                onClickFolder={onClickFolder}
                selecting={selecting}
                onSelect={() => {
                  /* Will add all codes in folder to selected codes */
                }}
                isSelected={false}
              />
            </Grid>
          ))}

          {folders && folders.length > 0 && (
            <Grid size={12}>
              <Divider />
            </Grid>
          )}

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
            <Stack direction="row" spacing={1} sx={{ mt: 4, mb: 2 }}>
              <Typography variant="h6" sx={{ color: "text.secondary" }}>
                Incompatible Codes
              </Typography>
              {
                <Tooltip
                  title="These codes may contain matches that were scouted using a different schema than your currently selected codes. Selected codes must me made with the same schema to export properly. If you wish to select one of these codes, try deselecting other codes first."
                  arrow
                  placement="top"
                >
                  <HelpIcon />
                </Tooltip>
              }
            </Stack>
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
