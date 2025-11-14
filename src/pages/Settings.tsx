import { useSchema } from "../context/SchemaContext";
import {
  Typography,
  Box,
  Stack,
  Card,
  CardContent,
  useTheme,
  Divider,
  Switch,
  FormControlLabel,
  Button,
  TextField,
} from "@mui/material";
import DropdownInput from "../ui/components/DropdownInput";
import SettingsIcon from "@mui/icons-material/SettingsRounded";
import SchemaIcon from "@mui/icons-material/DescriptionRounded";
import PaletteIcon from "@mui/icons-material/PaletteRounded";
import StorageIcon from "@mui/icons-material/StorageRounded";
import NotificationsIcon from "@mui/icons-material/NotificationsRounded";
import SecurityIcon from "@mui/icons-material/SecurityRounded";
import InfoIcon from "@mui/icons-material/InfoRounded";
import { useState } from "react";
import PageHeader from "../ui/PageHeader";
import { useSettings } from "../context/SettingsContext";

export default function Settings() {
  const { schemaName, availableSchemas } = useSchema();
  const { setSetting, settings } = useSettings();
  const theme = useTheme();

  // TODO: Make these actually function
  const [notifications, setNotifications] = useState(true);

  const handleChange = async (key: keyof Settings, value: any) => {
    await setSetting(key, value);
  };

  const handleLeadScoutToggle = (checked: boolean) => {
    handleChange("LEAD_SCOUT_ONLY", checked);
    if (checked) {
      handleChange("DEVICE_ID", 0);
    } else {
      handleChange("DEVICE_ID", 1);
    }
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
          value: settings.LAST_SCHEMA_NAME || schemaName || "",
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
          type: "switch",
          label: "Dark Mode",
          description: "Use dark theme throughout the app",
          checked: settings.THEME === "dark",
          onChange: (checked: boolean) => {
            handleChange("THEME", checked ? "dark" : "light");
          },
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
            "Device is only used to view and collect match data. Matches scouted with this device will not be counted towards collected scout metrics.",
          checked: settings.LEAD_SCOUT_ONLY || false,
          onChange: (checked: boolean) => handleLeadScoutToggle(checked),
        },
        !settings.LEAD_SCOUT_ONLY && {
          type: "number",
          label: "Device ID",
          description: "Identify this device in match data",
          value: settings.DEVICE_ID,
          onChange: (value: string) => handleChange("DEVICE_ID", value),
          onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
            let num = Math.round(Number(e.target.value));
            if (isNaN(num) || num < 1) {
              num = 1;
            }
            handleChange("DEVICE_ID", num);
          },
          inputProps: { min: 1 },
        },
        {
          type: "number",
          label: "Number of Scout Devices",
          description: "Set the total number of scouting devices",
          value: settings.EXPECTED_DEVICES_COUNT,
          onChange: (value: string) =>
            handleChange("EXPECTED_DEVICES_COUNT", value),
          onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
            let num = Math.round(Number(e.target.value));
            if (isNaN(num) || num < 1) {
              num = 1;
            }
            handleChange("EXPECTED_DEVICES_COUNT", num);
          },
          inputProps: { min: 1 },
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
          <TextField
            value={setting.value}
            onChange={(e) => setting.onChange(e.target.value)}
            size="small"
            sx={{ minWidth: 200 }}
          />
        );
      case "number":
        return (
          <TextField
            type="number"
            value={setting.value}
            onChange={(e) => setting.onChange(e.target.value)}
            onBlur={setting.onBlur}
            inputProps={setting.inputProps}
            size="small"
            sx={{ minWidth: 100 }}
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
      />

      {/* Settings Sections */}
      <Stack spacing={3}>
        {settingsSections.map((section) => (
          <Card
            key={section.id}
            elevation={0}
            sx={{
              border: `2px solid ${theme.palette.divider}`,
              borderRadius: 3,
              transition: "all 0.3s ease",
              "&:hover": {
                borderColor: section.color,
                boxShadow: `0 4px 12px ${section.color}20`,
              },
            }}
          >
            {/* Section Header */}
            <Box
              sx={{
                background: `linear-gradient(135deg, ${section.color}15 0%, ${section.color}05 100%)`,
                borderBottom: `2px solid ${theme.palette.divider}`,
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
                    backgroundColor: `${section.color}20`,
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
              <Stack spacing={3}>
                {section.settings.map(
                  (setting, index) =>
                    setting && (
                      <Box key={index}>
                        <Stack
                          direction="row"
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
                        {index < section.settings.length - 1 && (
                          <Divider sx={{ mt: 3 }} />
                        )}
                      </Box>
                    )
                )}
              </Stack>
            </CardContent>
          </Card>
        ))}

        {/* App Info Section */}
        <Card
          elevation={0}
          sx={{
            border: `2px solid ${theme.palette.divider}`,
            borderRadius: 3,
          }}
        >
          <Box
            sx={{
              background: `linear-gradient(135deg, ${theme.palette.info.main}15 0%, ${theme.palette.info.main}05 100%)`,
              borderBottom: `2px solid ${theme.palette.divider}`,
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
                  backgroundColor: `${theme.palette.info.main}20`,
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
                  FarmHand v0.1.0-beta.0
                </Typography>
              </Box>
              <Divider />
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Developed by
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  FRC Team 3655, The Tractor Technicians
                </Typography>
              </Box>
              <Divider />
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
                  sx={{ borderRadius: 2, borderWidth: 2 }}
                >
                  View Open Source Licenses
                </Button>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}
