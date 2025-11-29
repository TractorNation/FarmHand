import { Box, Divider } from "@mui/material";
import PageHeader from "../ui/PageHeader";
import AnalysisIcon from "@mui/icons-material/AutoGraphRounded";

export default function Analyzer() {
  return (
    <>
      <Box px={3} pt={2}>
        <PageHeader
          icon={<AnalysisIcon sx={{ fontSize: 28 }} />}
          title="Match data Analysis"
          subtitle="View and organize scouting data"
        />
      </Box>
      <Divider />
      <Box></Box>
    </>
  );
}
