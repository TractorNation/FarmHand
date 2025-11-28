import { useSchema } from "../context/SchemaContext";
import {
  Typography,
  Box,
  Stack,
  Card,
  CardContent,
  Divider,
  Switch,
  FormControlLabel,
  Button,
  Chip,
  Snackbar,
  Slide,
  useMediaQuery,
  Alert,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import DropdownInput from "../ui/components/DropdownInput";
import SettingsIcon from "@mui/icons-material/SettingsRounded";
import SchemaIcon from "@mui/icons-material/DescriptionRounded";
import PaletteIcon from "@mui/icons-material/PaletteRounded";
import StorageIcon from "@mui/icons-material/StorageRounded";
import NotificationsIcon from "@mui/icons-material/NotificationsRounded";
import SecurityIcon from "@mui/icons-material/SecurityRounded";
import InfoIcon from "@mui/icons-material/InfoRounded";
import SaveIcon from "@mui/icons-material/SaveRounded";
import WarningIcon from "@mui/icons-material/WarningRounded";
import { useState, useEffect } from "react";
import PageHeader from "../ui/PageHeader";
import { useSettings } from "../context/SettingsContext";
import { useNavigate } from "react-router";
import { themeRegistry } from "../config/themes";
import useDialog from "../hooks/useDialog";
import UnsavedSchemaChangesDialog from "../ui/dialog/UnsavedSchemaChangesDialog";
import NumberInput from "../ui/components/NumberInput";
import TextInput from "../ui/components/TextInput";

export default function Settings() {
  const { schemaName, availableSchemas } = useSchema();
  const { setSetting, settings, settingsLoading } = useSettings();
  const theme = useTheme();
  const navigate = useNavigate();
  const themeOptions = Object.keys(themeRegistry);
  const themedDropdownOptions = themeOptions.map((key) => ({
    value: key,
    label: themeRegistry[key as keyof typeof themeRegistry].meta.displayName,
  }));

  // Local state for editing settings
  const [editingSettings, setEditingSettings] = useState<Settings>(settings);
  const [originalSettings, setOriginalSettings] = useState<Settings>(settings);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const isLandscape = useMediaQuery("(orientation: landscape)");
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  const [
    unsavedChangesDialogOpen,
    openUnsavedChangesDialog,
    closeUnsavedChangesDialog,
  ] = useDialog();

  // Update local settings when context settings finish loading (initial load only)
  useEffect(() => {
    if (!settingsLoading && !isInitialized) {
      setEditingSettings(settings);
      setOriginalSettings(settings);
      setIsInitialized(true);
    }
  }, [settings, settingsLoading, isInitialized]);

  // Check for unsaved changes
  useEffect(() => {
    const hasChanges =
      JSON.stringify(editingSettings) !== JSON.stringify(originalSettings);
    setHasUnsavedChanges(hasChanges);
  }, [editingSettings, originalSettings]);

  const selectedTheme =
    themeRegistry[
      (editingSettings.COLOR_THEME as keyof typeof themeRegistry) ??
        "TractorTheme"
    ];
  const tintSurface = (color: string) =>
    alpha(color, theme.palette.mode === "light" ? 0.12 : 0.32);

  const handleChange = (key: keyof Settings, value: any) => {
    setEditingSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSaveSettings = async () => {
    // Save all settings
    for (const [key, value] of Object.entries(editingSettings)) {
      await setSetting(key as keyof Settings, value);
    }
    setOriginalSettings(editingSettings);
    setSnackbarOpen(true);
  };

  const handleLeadScoutToggle = (checked: boolean) => {
    handleChange("LEAD_SCOUT_ONLY", checked);
    if (checked) {
      handleChange("DEVICE_ID", 0);
    } else {
      handleChange("DEVICE_ID", 1);
    }
  };

  const handleNavigateToSchemas = () => {
    if (hasUnsavedChanges) {
      openUnsavedChangesDialog();
    } else {
      navigate("/schemas", { state: { showWarning: true } });
    }
  };

  const handleDiscardChanges = () => {
    closeUnsavedChangesDialog();
    setEditingSettings(originalSettings);
    navigate("/schemas", { state: { showWarning: true } });
  };

  // Settings sections organized by category
  const settingsSections = [
    {
      id: "scouting",
      title: "Scouting",
      icon: <SchemaIcon />,
      color: theme.palette.primary.main,
      settings: [
        {
          type: "dropdown",
          label: "Active Schema",
          description: "Select which scouting form to use",
          value: editingSettings.LAST_SCHEMA_NAME || schemaName || "",
          options: availableSchemas.map((s) => s.name),
          onChange: (value: string) => handleChange("LAST_SCHEMA_NAME", value),
        },
      ],
    },
    {
      id: "appearance",
      title: "Appearance",
      icon: <PaletteIcon />,
      color: theme.palette.secondary.main,
      settings: [
        {
          type: "dropdown",
          label: "Color Theme",
          description: "Select the color palette for the app",
          value: editingSettings.COLOR_THEME || "TractorTheme",
          options: themedDropdownOptions,
          onChange: (value: string) => handleChange("COLOR_THEME", value),
        },
        {
          type: "dropdown",
          label: "Theme Mode",
          description: "Use light, dark, or system theme",
          value:
            editingSettings.THEME.charAt(0).toUpperCase() +
            editingSettings.THEME.slice(1),
          options: ["Light", "Dark", "System"],
          onChange: (value: string) =>
            handleChange("THEME", value.toLowerCase()),
        },
      ],
    },
    {
      id: "device",
      title: "Device",
      icon: <StorageIcon />,
      color: theme.palette.info.main,
      settings: [
        {
          type: "switch",
          label: "Lead Scout only",
          description:
            "If checked, device will only be used to collect scouting data. Matches scouted on this device will not count towards total scouting metrics",
          checked: editingSettings.LEAD_SCOUT_ONLY || false,
          onChange: (checked: boolean) => handleLeadScoutToggle(checked),
        },
        !editingSettings.LEAD_SCOUT_ONLY && {
          type: "number",
          label: "Device ID",
          description: "Identify this device in match data",
          value: editingSettings.DEVICE_ID,
          onChange: (value: number | null) => {
            const num = value === null ? 1 : Math.max(1, value);
            handleChange("DEVICE_ID", num);
          },
          inputProps: { min: 1 },
        },
        {
          type: "number",
          label: "Number of Scout Devices",
          description: "Set the total number of scouting devices",
          value: editingSettings.EXPECTED_DEVICES_COUNT,
          onChange: (value: number | null) => {
            const num = value === null ? 1 : Math.max(1, Math.min(50, value));
            handleChange("EXPECTED_DEVICES_COUNT", num);
          },
          inputProps: { min: 1, max: 50 },
        },
      ].filter(Boolean),
    },
    {
      id: "notifications",
      title: "Notifications",
      icon: <NotificationsIcon />,
      color: theme.palette.warning.main,
      settings: [
        {
          type: "switch",
          label: "Enable Notifications",
          description: "Show alerts for important events",
          checked: notifications,
          onChange: (checked: boolean) => setNotifications(checked),
        },
      ],
    },
    {
      id: "privacy",
      title: "Privacy & Security",
      icon: <SecurityIcon />,
      color: theme.palette.error.main,
      settings: [
        {
          type: "button",
          label: "Clear All Data",
          description: "Remove all scouting data from this device",
          buttonText: "Clear Data",
          buttonColor: "error" as const,
        },
      ],
    },
  ];

  const renderSettingControl = (setting: any) => {
    switch (setting.type) {
      case "dropdown":
        return (
          <DropdownInput
            label={setting.label}
            options={setting.options}
            value={setting.value}
            onChange={setting.onChange}
          />
        );

      case "switch":
        return (
          <FormControlLabel
            control={
              <Switch
                checked={setting.checked}
                onChange={(e) => setting.onChange(e.target.checked)}
              />
            }
            label=""
            sx={{ m: 0 }}
          />
        );

      case "text":
        return (
          <TextInput
            value={setting.value}
            onChange={(value) => setting.onChange(value)}
            label={setting.label}
          />
        );
      case "number":
        return (
          <NumberInput
            label={setting.label}
            value={setting.value}
            onChange={(value) => setting.onChange(value)}
            min={setting.inputProps.min}
            max={setting.inputProps.max}
            fullWidth
          />
        );
      case "button":
        return (
          <Button
            variant="contained"
            color={setting.buttonColor}
            onClick={setting.onClick}
            sx={{ borderRadius: 2 }}
          >
            {setting.buttonText}
          </Button>
        );

      default:
        return null;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <PageHeader
        icon={<SettingsIcon sx={{ fontSize: 28 }} />}
        title="Settings"
        subtitle="Configure FarmHand to your preferences"
        trailingComponent={
          <Stack direction="column" spacing={2} alignItems="center">
            {hasUnsavedChanges && (
              <Chip
                icon={<WarningIcon />}
                label="Unsaved Changes"
                color="warning"
                sx={{
                  fontWeight: 600,
                  fontFamily: theme.typography.body1,
                }}
              />
            )}
            <Button
              variant="contained"
              color="primary"
              onClick={handleSaveSettings}
              startIcon={<SaveIcon />}
              size="large"
              disabled={!hasUnsavedChanges}
              sx={{ borderRadius: 2 }}
            >
              Save Settings
            </Button>
          </Stack>
        }
      />

      {/* Settings Sections */}
      <Stack spacing={3}>
        {settingsSections.map((section) => (
          <Card
            key={section.id}
            elevation={0}
            sx={{
              border: `1px solid ${theme.palette.surface.outline}`,
              borderRadius: theme.shape.borderRadius,
              backgroundColor: theme.palette.surface.elevated,
              transition: "all 0.3s ease",
              "&:hover": {
                borderColor: alpha(section.color, 0.6),
                boxShadow: theme.customShadows.card,
                transform: "translateY(-2px)",
              },
            }}
          >
            {/* Section Header */}
            <Box
              sx={{
                backgroundColor: tintSurface(section.color),
                borderBottom: `1px solid ${theme.palette.surface.outline}`,
                p: 2,
              }}
            >
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: alpha(
                      section.color,
                      theme.palette.mode === "light" ? 0.2 : 0.35
                    ),
                    color: section.color,
                  }}
                >
                  {section.icon}
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {section.title}
                </Typography>
              </Stack>
            </Box>

            {/* Section Content */}
            <CardContent sx={{ p: 3 }}>
              <Stack spacing={3} justifyContent="center">
                {section.settings.map(
                  (setting, index) =>
                    setting && (
                      <Box key={index}>
                        <Stack
                          direction={isLandscape ? "row" : "column"}
                          alignItems="center"
                          justifyContent="space-between"
                          spacing={2}
                        >
                          <Box sx={{ flexGrow: 1 }}>
                            <Typography
                              variant="subtitle1"
                              sx={{ fontWeight: 600 }}
                            >
                              {setting.label}
                            </Typography>
                            <Typography variant="body1" color="text.secondary">
                              {setting.description}
                            </Typography>
                          </Box>
                          <Box sx={{ flexShrink: 0 }}>
                            {renderSettingControl(setting)}
                          </Box>
                        </Stack>
                        {setting.label === "Color Theme" &&
                          selectedTheme?.meta?.flavorText && (
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ mt: 1.5 }}
                            >
                              {selectedTheme.meta.flavorText}
                            </Typography>
                          )}
                        {index < section.settings.length - 1 && (
                          <Divider
                            sx={{
                              mt: 3,
                              borderColor: theme.palette.surface.outline,
                            }}
                          />
                        )}
                      </Box>
                    )
                )}
              </Stack>
            </CardContent>
            {section.id === "scouting" && (
              <>
                <Divider sx={{ borderColor: theme.palette.surface.outline }} />
                <Box sx={{ p: 2 }}>
                  <Button
                    fullWidth
                    variant="outlined"
                    color="primary"
                    onClick={handleNavigateToSchemas}
                    startIcon={<SchemaIcon />}
                    sx={{
                      borderRadius: theme.shape.borderRadius,
                      py: 1.5,
                      borderWidth: 2,
                      "&:hover": { borderWidth: 2 },
                    }}
                  >
                    Open Schema Editor
                  </Button>
                </Box>
              </>
            )}
          </Card>
        ))}

        {/* App Info Section */}
        <Card
          elevation={0}
          sx={{
            border: `1px solid ${theme.palette.surface.outline}`,
            borderRadius: theme.shape.borderRadius,
          }}
        >
          <Box
            sx={{
              backgroundColor: tintSurface(theme.palette.info.main),
              borderBottom: `1px solid ${theme.palette.surface.outline}`,
              p: 2,
            }}
          >
            <Stack direction="row" alignItems="center" spacing={2}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: alpha(
                    theme.palette.info.main,
                    theme.palette.mode === "light" ? 0.2 : 0.35
                  ),
                  color: theme.palette.info.main,
                }}
              >
                <InfoIcon />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                About
              </Typography>
            </Stack>
          </Box>
          <CardContent sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Version
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  FarmHand v0.2.0-beta.1
                </Typography>
              </Box>
              <Divider sx={{ borderColor: theme.palette.surface.outline }} />
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Developed by
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  FRC Team 3655, The Tractor Technicians
                </Typography>
              </Box>
              <Divider sx={{ borderColor: theme.palette.surface.outline }} />
              <Box>
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  gutterBottom
                >
                  Licenses
                </Typography>
                <Button
                  variant="outlined"
                  color="info"
                  sx={{
                    borderRadius: theme.shape.borderRadius,
                    borderWidth: 2,
                  }}
                >
                  View Open Source Licenses
                </Button>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      <UnsavedSchemaChangesDialog
        open={unsavedChangesDialogOpen}
        onClose={closeUnsavedChangesDialog}
        onDiscard={handleDiscardChanges}
      />

      <Snackbar
        open={snackbarOpen}
        onClose={() => setSnackbarOpen(false)}
        slots={{ transition: Slide }}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        autoHideDuration={1200}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity="success"
          variant="filled"
        >
          Successfully saved settings
        </Alert>
      </Snackbar>
    </Box>
  );
}
