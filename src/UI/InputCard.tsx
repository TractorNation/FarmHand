import { Card, CardContent, Typography, Box } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
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
  const isWindowsXPTheme = theme.farmhandThemeId === "WindowsXPTheme";

  const showError = required && !valid && (touched || submitted);

  return (
    <Card
      variant="outlined"
      elevation={0}
      sx={{
        borderColor: showError
          ? theme.palette.error.main
          : theme.palette.surface.outline,
        borderWidth: 1,
        borderStyle: "solid",
        borderRadius: isWindowsXPTheme ? 3 : theme.shape.borderRadius,
        p: 2,
        height: "100%",
        backgroundColor: theme.palette.surface.elevated,
        backgroundImage: isWindowsXPTheme
          ? `linear-gradient(180deg, #fdfdff, #e4ecf7)`
          : undefined,
        transition: "all 0.3s ease",
        alignContent: "center",
        display: "flex",
        flexDirection: "column",
        boxShadow: isWindowsXPTheme
          ? `inset 0 1px 0 ${alpha("#ffffff", 0.85)}, inset 0 -1px 0 ${alpha(
              "#aeb9d0",
              0.6
            )}`
          : undefined,
        "&:hover": {
          borderColor: showError
            ? theme.palette.error.light
            : alpha(theme.palette.primary.main, 0.6),
          boxShadow: showError
            ? `0 6px 18px ${alpha(theme.palette.error.main, 0.3)}`
            : isWindowsXPTheme
            ? `0 0 0 1px ${alpha("#245edb", 0.6)}`
            : theme.customShadows.card,
          transform: isWindowsXPTheme ? "none" : "translateY(-2px)",
        },
      }}
    >
      <CardContent
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: isWindowsXPTheme ? "flex-start" : "center",
          justifyContent: "flex-start",
          flexGrow: 1,
          width: "100%",
        }}
      >
        {showError && (
          <Typography variant="subtitle1" sx={{ mb: 1 }} color="error">
            This field is required
          </Typography>
        )}
        <Typography
          variant="h6"
          sx={{
            mb: 2,
            fontWeight: 600,
            ...(isWindowsXPTheme && {
              fontFamily: '"Tahoma", "MS Sans Serif", sans-serif',
              fontSize: "0.95rem",
              color: "#0f3fa6",
            }),
          }}
        >
          {label + " "}
          {required && "*"}
        </Typography>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: isWindowsXPTheme ? "stretch" : "center",
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