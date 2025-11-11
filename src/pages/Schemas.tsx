import { useState } from "react";
import {
  Box,
  Typography,
  Button,
  Stack,
  Divider,
  TextField,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  Card,
  CardContent,
} from "@mui/material";
import AddIcon from "@mui/icons-material/AddRounded";
import EditIcon from "@mui/icons-material/EditRounded";
import DeleteIcon from "@mui/icons-material/DeleteRounded";
import ArrowBackIcon from "@mui/icons-material/ArrowBackRounded";
import useDialog from "../hooks/useDialog";
import { useSchema } from "../context/SchemaContext";
import TextInput from "../ui/components/TextInput";
import { saveSchema } from "../utils/SchemaUtils";

export default function SchemaEditor() {
  const theme = useTheme();
  const { availableSchemas, refreshSchemas } = useSchema();
  const [editingSchema, setEditingSchema] = useState<any | null>(null);
  const [sectionDialogOpen, openSectionDialog, closeSectionDialog] =
    useDialog();
  const [newSchemaDialogOpen, openNewSchemaDialog, closeNewSchemaDialog] =
    useDialog();
  const [newSchemaName, setNewSchemaName] = useState("");

  const [newSectionName, setNewSectionName] = useState("");

  const handleCreateSchema = async () => {
    await saveSchema({ name: newSchemaName, sections: [] } as Schema);
    closeNewSchemaDialog();
    refreshSchemas();
  };

  const handleAddSection = () => {
    if (!editingSchema) return;
    setEditingSchema({
      ...editingSchema,
      sections: [
        ...editingSchema.sections,
        { title: newSectionName, fields: [] },
      ],
    });
    setNewSectionName("");
    closeSectionDialog();
  };

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        p: 2,
        bgcolor: theme.palette.background.default,
      }}
    >
      {!editingSchema ? (
        <>
          <Typography variant="h4" gutterBottom>
            Schemas
          </Typography>
          <List sx={{ flexGrow: 1 }}>
            {availableSchemas.map((s, i) => (
              <ListItem
                key={i}
                secondaryAction={
                  <Stack direction="row" spacing={1}>
                    <IconButton
                      onClick={() => setEditingSchema({ ...s.schema })}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton color="error">
                      <DeleteIcon />
                    </IconButton>
                  </Stack>
                }
              >
                <ListItemButton
                  onClick={() => setEditingSchema({ ...s.schema })}
                >
                  <ListItemText primary={s.name} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openNewSchemaDialog}
          >
            Create New Schema
          </Button>
        </>
      ) : (
        <>
          <Stack direction="row" alignItems="center" spacing={1}>
            <IconButton onClick={() => setEditingSchema(null)}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h5">Editing: {editingSchema.name}</Typography>
          </Stack>
          <Divider sx={{ my: 2 }} />

          <Stack spacing={2}>
            {editingSchema.sections?.length ? (
              editingSchema.sections.map((section: SectionData, i: number) => (
                <Card key={i} variant="outlined" sx={{ borderRadius: 3 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {section.title}
                    </Typography>
                    {section.fields.length ? (
                      section.fields.map((field: Component, id) => (
                        <Card key={id}>{field.name}</Card>
                      ))
                    ) : (
                      <Typography variant="body1" color="text.secondary">
                        (No fields yet)
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <Typography color="text.secondary">
                No sections yet. Add one below.
              </Typography>
            )}

            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={openSectionDialog}
              sx={{ alignSelf: "flex-start" }}
            >
              Add Section
            </Button>
          </Stack>
        </>
      )}

      {/* Add Section Dialog */}
      <Dialog open={sectionDialogOpen} onClose={closeSectionDialog}>
        <DialogTitle>Add Section</DialogTitle>
        <DialogContent>
          <TextField
            label="Section Name"
            value={newSectionName}
            onChange={(e) => setNewSectionName(e.target.value)}
            fullWidth
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeSectionDialog}>Cancel</Button>
          <Button onClick={handleAddSection} variant="contained">
            Add
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={newSchemaDialogOpen} onClose={closeNewSchemaDialog}>
        <DialogTitle>Create Schema</DialogTitle>
        <DialogContent>
          <TextInput
            label="Schema Name"
            value={newSchemaName}
            onChange={(value) => setNewSchemaName(value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeNewSchemaDialog}>Cancel</Button>
          <Button onClick={handleCreateSchema} variant="contained">
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
