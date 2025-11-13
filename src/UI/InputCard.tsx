import { Card, CardContent, Typography, Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { ReactNode, memo } from "react";
import { useValidation } from "../context/ValidationContext";

/**
 * Props for InputCard
 */
interface InputCardProps {
  label: string;
  required: boolean;
  children: ReactNode;
  submitted: boolean;
}

/**
 *
 * @param props {@link InputCardProps}
 * @returns A Card wrapper for all the input components
 */
function InputCard(props: InputCardProps) {
  const { label, required, children, submitted } = props;
  const { valid, touched } = useValidation();
  const theme = useTheme();

  const showError = required && !valid && (touched || submitted);

  return (
    <Card
      variant="outlined"
      elevation={0}
      sx={{
        borderColor: showError
          ? theme.palette.error.main
          : theme.palette.divider,
        borderWidth: 2,
        borderStyle: "solid",
        borderRadius: 3,
        p: 2,
        height: "100%",
        backgroundColor: theme.palette.background.paper,
        transition: "all 0.3s ease",
        alignContent: "center",
        display: "flex",
        flexDirection: "column",
        "&:hover": {
          borderColor: showError
            ? theme.palette.error.light
            : theme.palette.primary.light,
          boxShadow: showError
            ? `0 4px 12px ${theme.palette.error.main}20`
            : `0 4px 12px ${theme.palette.primary.main}15`,
        },
      }}
    >
      <CardContent
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          flexGrow: 1,
        }}
      >
        {showError && (
          <Typography variant="subtitle1" sx={{ mb: 1 }} color="error">
            This field is required
          </Typography>
        )}
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          {label + " "}
          {required && "*"}
        </Typography>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            flexGrow: 1,
            width: "100%",
          }}
        >
          {children}
        </Box>
      </CardContent>
    </Card>
  );
}

export default memo(InputCard);