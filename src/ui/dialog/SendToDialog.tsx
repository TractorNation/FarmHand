import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tabs,
  Tab,
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  useTheme,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
} from "@mui/material";
import { useState } from "react";
import FolderIcon from "@mui/icons-material/FolderRounded";
import SendIcon from "@mui/icons-material/SendRounded";
import ArchiveIcon from "@mui/icons-material/ArchiveRounded";
import CheckIcon from "@mui/icons-material/CheckRounded";

interface SendToDialogProps {
  open: boolean;
  onClose: () => void;
  onMoveToFolder: (folderId: string) => void;
  onMoveToArchive?: (includeFolders: boolean) => void;
  folders: QrFolder[];
  selectedCodesCount: number;
  selectedFolders?: QrFolder[];
  showArchiveTab?: boolean;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

export default function SendToDialog(props: SendToDialogProps) {
  const {
    open,
    onClose,
    onMoveToFolder,
    onMoveToArchive,
    folders,
    selectedCodesCount,
    selectedFolders = [],
    showArchiveTab = true,
  } = props;
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [archiveOption, setArchiveOption] = useState<"codes" | "folders">(
    "codes"
  );

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleMoveToArchiveClick = () => {
    if (onMoveToArchive) onMoveToArchive(archiveOption === "folders");
    onClose();
  };

  const hasSelectedFolders = selectedFolders.length > 0;
  const totalCodesInSelectedFolders = selectedFolders.reduce(
    (sum, folder) => sum + folder.qrCodes.length,
    0
  );

  const handleMoveToFolderClick = () => {
    if (selectedFolderId) {
      onMoveToFolder(selectedFolderId);
      onClose();
    }
  };

  const handleClose = () => {
    setSelectedFolderId(null);
    setTabValue(0);
    setArchiveOption("codes");
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3,
            minWidth: 360,
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          gap: 1,
          pb: 1,
        }}
      >
        <SendIcon color="primary" />
        Send {selectedCodesCount} Code{selectedCodesCount !== 1 ? "s" : ""} To
      </DialogTitle>

      {showArchiveTab && (
        <Box sx={{ borderBottom: 1, borderColor: "divider", px: 2 }}>
          <Tabs value={tabValue} onChange={handleTabChange} variant="fullWidth">
            <Tab icon={<FolderIcon />} iconPosition="start" label="Folder" />
            <Tab icon={<ArchiveIcon />} iconPosition="start" label="Archive" />
          </Tabs>
        </Box>
      )}

      <DialogContent sx={{ minHeight: 200 }}>
        {/* Folder Tab */}
        <TabPanel value={tabValue} index={0}>
          {folders.length === 0 ? (
            <Box
              sx={{
                textAlign: "center",
                py: 4,
                color: "text.secondary",
              }}
            >
              <FolderIcon sx={{ fontSize: 48, opacity: 0.5, mb: 1 }} />
              <Typography variant="body1">No folders available</Typography>
              <Typography variant="body2" color="text.secondary">
                Create a folder first to move codes
              </Typography>
            </Box>
          ) : (
            <List sx={{ py: 0 }}>
              {folders.map((folder) => (
                <ListItemButton
                  key={folder.id}
                  selected={selectedFolderId === folder.id}
                  onClick={() => setSelectedFolderId(folder.id)}
                  sx={{
                    borderRadius: 2,
                    mb: 1,
                    border: `1px solid ${
                      selectedFolderId === folder.id
                        ? theme.palette.primary.main
                        : theme.palette.divider
                    }`,
                    "&.Mui-selected": {
                      backgroundColor: `${theme.palette.primary.main}15`,
                      "&:hover": {
                        backgroundColor: `${theme.palette.primary.main}25`,
                      },
                    },
                  }}
                >
                  <ListItemIcon>
                    <FolderIcon
                      color={
                        selectedFolderId === folder.id ? "primary" : "inherit"
                      }
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={folder.name}
                    secondary={`${folder.qrCodes.length} codes`}
                  />
                  {selectedFolderId === folder.id && (
                    <CheckIcon color="primary" />
                  )}
                </ListItemButton>
              ))}
            </List>
          )}
        </TabPanel>

        {/* Archive Tab */}
        <TabPanel value={tabValue} index={1}>
          {hasSelectedFolders ? (
            <Box>
              <Typography sx={{ mb: 2 }}>
                You have selected {selectedFolders.length} folder
                {selectedFolders.length !== 1 ? "s" : ""} containing{" "}
                {totalCodesInSelectedFolders} code
                {totalCodesInSelectedFolders !== 1 ? "s" : ""}
                {selectedCodesCount > totalCodesInSelectedFolders && (
                  <>
                    , plus {selectedCodesCount - totalCodesInSelectedFolders}{" "}
                    individual code
                    {selectedCodesCount - totalCodesInSelectedFolders !== 1
                      ? "s"
                      : ""}
                  </>
                )}
                .
              </Typography>

              <FormControl component="fieldset">
                <RadioGroup
                  value={archiveOption}
                  onChange={(e) =>
                    setArchiveOption(e.target.value as "codes" | "folders")
                  }
                >
                  <FormControlLabel
                    value="codes"
                    control={<Radio />}
                    label={
                      <Box>
                        <Typography variant="body1" fontWeight={500}>
                          Archive codes only
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Archive the {selectedCodesCount} selected codes.
                          Folders will remain but become empty.
                        </Typography>
                      </Box>
                    }
                    sx={{ alignItems: "flex-start", mb: 1 }}
                  />
                  <FormControlLabel
                    value="folders"
                    control={<Radio />}
                    label={
                      <Box>
                        <Typography variant="body1" fontWeight={500}>
                          <FolderIcon
                            sx={{
                              fontSize: 18,
                              mr: 0.5,
                              verticalAlign: "text-bottom",
                            }}
                          />
                          Archive folders and codes
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Archive the {selectedFolders.length} folder
                          {selectedFolders.length !== 1 ? "s" : ""} and all
                          their codes together.
                        </Typography>
                      </Box>
                    }
                    sx={{ alignItems: "flex-start" }}
                  />
                </RadioGroup>
              </FormControl>
            </Box>
          ) : (
            <Box
              sx={{
                textAlign: "center",
                py: 4,
                color: "text.secondary",
              }}
            >
              <ArchiveIcon sx={{ fontSize: 48, opacity: 0.5, mb: 1 }} />
              <Typography variant="body1" sx={{ mb: 2 }}>
                Move {selectedCodesCount} code
                {selectedCodesCount !== 1 ? "s" : ""} to archive?
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Codes will be moved to the archive page
              </Typography>
            </Box>
          )}
        </TabPanel>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} sx={{ borderRadius: 2 }}>
          Cancel
        </Button>
        {!showArchiveTab || tabValue === 0 ? (
          <Button
            onClick={handleMoveToFolderClick}
            variant="contained"
            disabled={!selectedFolderId || folders.length === 0}
            sx={{ borderRadius: 2 }}
          >
            Move to Folder
          </Button>
        ) : (
          <Button
            onClick={handleMoveToArchiveClick}
            variant="contained"
            color="warning"
            sx={{ borderRadius: 2 }}
          >
            Send to Archive
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
