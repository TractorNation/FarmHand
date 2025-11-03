import { Card, CardContent, Typography, Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { ReactNode } from "react";
import { useValidation } from "../context/ValidationContext";
import { useScoutData } from "../context/ScoutDataContext";

/**
 * Props for InputCard
 */
interface InputCardProps {
  label: string;
  required: boolean;
  errorMessage?: string;
  children: ReactNode;
}

/**
 *
 * @param props {@link InputCardProps}
 * @returns A Card wrapper for all the input components
 */
export default function InputCard(props: InputCardProps) {
  const { label, required, errorMessage, children } = props;
  const { valid, touched } = useValidation();
  const { submitted } = useScoutData();
  const theme = useTheme();

  const showError = required && !valid && (touched || submitted);

  return (
    <Card
      variant="outlined"
      sx={{
        borderColor: showError
          ? theme.palette.error.main
          : theme.palette.divider,
        borderWidth: 2,
        borderStyle: "solid",
        borderRadius: 2,
        p: 2,
        minWidth: "fit-content",
        height: "100%",
        backgroundColor: theme.palette.background.paper,
        transition: "border-color 0.2s ease, background-color 0.2s ease",
        alignContent: "center",
      }}
    >
      <CardContent
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {showError && (
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            {errorMessage ?? "This field is required"}
          </Typography>
        )}
        <Typography variant="h6" sx={{ mb: 1 }}>
          {label + " "}
          {required && "*"}
        </Typography>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
          }}
        >
          {children}
        </Box>
      </CardContent>
    </Card>
  );
}
