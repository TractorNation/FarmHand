import { Card, CardContent, Typography, Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { ReactNode } from "react";
import useValidation from "../hooks/useValidation";

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
  const { valid } = useValidation();
  const theme = useTheme();

  return (
    <Card
      variant="outlined"
      sx={{
        borderColor: valid ? theme.palette.divider : theme.palette.error.main,
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
        {!valid && (
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
