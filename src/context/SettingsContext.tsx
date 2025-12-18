import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import StoreManager, { StoreKeys } from "../utils/StoreManager";

export const defaultSettings: Settings = {
  LAST_SCHEMA_NAME: "2025 Reefscape",
  THEME: "system",
  TBA_API_KEY: "",
  TBA_EVENT_KEY: "",
  DEVICE_ID: 1,
  AUTOSAVE_ON_COMPLETE: true,
  EXPECTED_DEVICES_COUNT: 6,
  LEAD_SCOUT_ONLY: false,
  COLOR_THEME: "TractorTheme",
};

interface SettingsContextType {
  settings: Settings;
  setSetting: <K extends keyof Settings>(
    key: K,
    value: Settings[K]
  ) => Promise<void>;
  loadSettings: () => Promise<void>;
  settingsLoading: boolean;
  resetToDefaults: () => void;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export default function SettingsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [settingsLoading, setSettingsLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    setSettingsLoading(true);
    const newSettings = new Map<string, any>();
    const settingKeys = Object.keys(defaultSettings) as Array<keyof Settings>;

    for (const key of settingKeys) {
      const storeKey = StoreKeys.settings[key];
      if (!storeKey) continue;

      const storedValue = await StoreManager.get(storeKey);
      const defaultValue = defaultSettings[key as keyof Settings];

      if (storedValue === null || storedValue === undefined) {
        if (defaultValue !== undefined) {
          await StoreManager.set(storeKey, String(defaultValue));
        }
        newSettings.set(key, defaultValue);
      } else {
        if (typeof defaultValue === "boolean") {
          newSettings.set(key, storedValue === "true" ? true : false);
        } else if (typeof defaultValue === "number") {
          const num = parseInt(storedValue, 10);
          newSettings.set(key, isNaN(num) ? defaultValue : num);
        } else {
          newSettings.set(key, storedValue as any);
        }
      }
    }

    setSettings(Object.fromEntries(newSettings) as Settings);
    setSettingsLoading(false);
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const setSetting = useCallback(async (key: keyof Settings, value: any) => {
    const storeKey = StoreKeys.settings[key];
    if (!storeKey) return;

    await StoreManager.set(storeKey, String(value));

    setSettings((prevSettings) => ({
      ...prevSettings,
      [key]: value,
    }));
  }, []);

  const resetToDefaults = async () => {
    setSettingsLoading(true);
    const newSettings = new Map<string, any>();
    const settingKeys = Object.keys(defaultSettings) as Array<keyof Settings>;

    for (const key of settingKeys) {
      const defaultValue = defaultSettings[key as keyof Settings];
      const storeKey = StoreKeys.settings[key];
      
      if (storeKey) {
        await StoreManager.set(storeKey, String(defaultValue));
      }

      newSettings.set(key, defaultValue);
    }

    setSettings(Object.fromEntries(newSettings) as Settings);
    setSettingsLoading(false);
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        setSetting,
        loadSettings,
        settingsLoading,
        resetToDefaults,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
