import { Box, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { ReactNode } from "react";

interface PageHeaderProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  trailingComponent?: ReactNode;
  leadingComponent?: ReactNode;
}

/**
 * Reusable page header component
 * Use this at the top of each page for consistent styling
 */
export default function PageHeader(props: PageHeaderProps) {
  const { icon, title, subtitle, trailingComponent, leadingComponent } = props;
  const theme = useTheme();
  const isWindowsXPTheme = theme.farmhandThemeId === "WindowsXPTheme";

  return (
    <Box
      sx={{
        mb: 4,
        ...(isWindowsXPTheme && {
          borderBottom: "1px solid rgba(0,0,0,0.15)",
          pb: 1.5,
        }),
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent={"space-between"}
        spacing={2}
      >
        <Stack direction="row" alignItems="center" spacing={2}>
          {leadingComponent}
          <Box
            sx={{
              width: isWindowsXPTheme ? 44 : 48,
              height: isWindowsXPTheme ? 44 : 48,
              borderRadius: isWindowsXPTheme ? 1 : 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: isWindowsXPTheme
                ? undefined
                : alpha(
                    theme.palette.primary.main ??
                      theme.palette.primary.container,
                    0.32
                  ),
              backgroundImage: isWindowsXPTheme
                ? "linear-gradient(180deg, #2a6ad9 0%, #1744a2 90%)"
                : undefined,
              border: isWindowsXPTheme
                ? "1px solid rgba(7,32,96,0.65)"
                : undefined,
              boxShadow: isWindowsXPTheme
                ? `inset 0 1px 0 ${alpha("#ffffff", 0.6)}`
                : undefined,
              color: isWindowsXPTheme
                ? "#fff"
                : theme.palette.primary.onContainer ??
                  theme.palette.primary.main,
            }}
          >
            {icon}
          </Box>
          <Box>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 600,
                ...(isWindowsXPTheme && {
                  fontFamily: '"Trebuchet MS", "Tahoma", sans-serif',
                  fontSize: "1.15rem",
                  color: "#0f3fa6",
                  textShadow: `0 1px 0 ${alpha("#ffffff", 0.6)}`,
                }),
              }}
            >
              {title}
            </Typography>
            {subtitle && (
              <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={
                  isWindowsXPTheme
                    ? {
                        fontFamily: '"Tahoma", "MS Sans Serif", sans-serif',
                        fontSize: "0.85rem",
                        color: "#1f1f1f",
                      }
                    : undefined
                }
              >
                {subtitle}
              </Typography>
            )}
          </Box>
        </Stack>
        {trailingComponent}
      </Stack>
    </Box>
  );
}
