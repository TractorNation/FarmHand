import { useState, useEffect } from "react";
import { decodeQR } from "../../utils/QrUtils";
import { Dialog, DialogTitle, DialogContent, Stack, Autocomplete, TextField, Typography, DialogActions, Button } from "@mui/material";

export default function FilterDialog({
  open,
  onClose,
  currentTeams,
  currentMatches,
  onSave,
  availableData,
  schema,
}: {
  open: boolean;
  onClose: () => void;
  currentTeams: number[];
  currentMatches: number[];
  onSave: (teams: number[], matches: number[]) => void;
  availableData: QrCode[];
  schema?: Schema;
}) {
  const [selectedTeams, setSelectedTeams] = useState<number[]>(currentTeams);
  const [selectedMatches, setSelectedMatches] =
    useState<number[]>(currentMatches);
  const [uniqueTeams, setUniqueTeams] = useState<number[]>([]);
  const [uniqueMatches, setUniqueMatches] = useState<number[]>([]);

  useEffect(() => {
    setSelectedTeams(currentTeams);
    setSelectedMatches(currentMatches);
  }, [currentTeams, currentMatches, open]);

  // Extract unique teams and matches from QR codes
  useEffect(() => {
    const extractTeamsAndMatches = async () => {
      if (!schema || availableData.length === 0) {
        setUniqueTeams([]);
        setUniqueMatches([]);
        return;
      }

      // Find field indices for "Match Number" and "Team Number"
      const allFields = schema.sections.flatMap((section) => section.fields);
      const matchNumberIndex = allFields.findIndex(
        (field) => field.name === "Match Number"
      );
      const teamNumberIndex = allFields.findIndex(
        (field) => field.name === "Team Number"
      );

      if (matchNumberIndex === -1 && teamNumberIndex === -1) {
        setUniqueTeams([]);
        setUniqueMatches([]);
        return;
      }

      const teams = new Set<number>();
      const matches = new Set<number>();

      // Process all QR codes
      const nonArchivedCodes = availableData.filter((qr) => !qr.archived);
      const decodedResults = await Promise.all(
        nonArchivedCodes.map(async (qr) => {
          try {
            const decoded = await decodeQR(qr.data);
            return decoded;
          } catch (e) {
            return null;
          }
        })
      );

      // Extract teams and matches from decoded data
      decodedResults.forEach((decoded) => {
        if (!decoded) return;

        if (
          matchNumberIndex !== -1 &&
          decoded.data[matchNumberIndex] !== undefined
        ) {
          const matchNum = Number(decoded.data[matchNumberIndex]);
          if (!isNaN(matchNum) && matchNum > 0) {
            matches.add(matchNum);
          }
        }

        if (
          teamNumberIndex !== -1 &&
          decoded.data[teamNumberIndex] !== undefined
        ) {
          const teamNum = Number(decoded.data[teamNumberIndex]);
          if (!isNaN(teamNum) && teamNum > 0) {
            teams.add(teamNum);
          }
        }
      });

      setUniqueTeams(Array.from(teams).sort((a, b) => a - b));
      setUniqueMatches(Array.from(matches).sort((a, b) => a - b));
    };

    if (open) {
      extractTeamsAndMatches();
    }
  }, [availableData, schema, open]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Filter Data</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <Autocomplete
            multiple
            options={uniqueTeams}
            value={selectedTeams}
            onChange={(_, newValue) => setSelectedTeams(newValue)}
            renderInput={(params) => (
              <TextField {...params} label="Teams" placeholder="All teams" />
            )}
          />
          <Autocomplete
            multiple
            options={uniqueMatches}
            value={selectedMatches}
            onChange={(_, newValue) => setSelectedMatches(newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Matches"
                placeholder="All matches"
              />
            )}
          />
          <Typography variant="body2" color="text.secondary">
            Leave empty to include all teams/matches
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => onSave(selectedTeams, selectedMatches)}
        >
          Apply Filters
        </Button>
      </DialogActions>
    </Dialog>
  );
}
