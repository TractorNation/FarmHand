import { Box, Stack, Typography, useTheme } from "@mui/material";
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

  return (
    <Box sx={{ mb: 4 }}>
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
              width: 48,
              height: 48,
              borderRadius: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: `${theme.palette.primary.main}20`,
              color: theme.palette.primary.main,
            }}
          >
            {icon}
          </Box>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 600 }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="subtitle2" color="text.secondary">
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
