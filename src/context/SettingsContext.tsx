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
  LAST_SCHEMA_NAME: undefined,
  THEME: "system",
  DEVICE_ID: 1,
  EXPECTED_DEVICES_COUNT: 6,
  LEAD_SCOUT_ONLY: false,
  COLOR_THEME: "Tractor",
};

interface SettingsContextType {
  settings: Settings;
  setSetting: <K extends keyof Settings>(
    key: K,
    value: Settings[K]
  ) => Promise<void>;
  loadSettings: () => Promise<void>;
  settingsLoading: boolean;
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
    const settingKeys = Object.keys(StoreKeys.settings) as Array<
      keyof Settings
    >;

    const storedValues = new Map<string, string>();

    for (const key of settingKeys) {
      const storeKey = StoreKeys.settings[key];
      if (!storeKey) continue;
      const storedValue = await StoreManager.get(storeKey);

      if (storedValue !== null && storedValue !== undefined) {
        const defaultValue = defaultSettings[key];
        if (typeof defaultValue === "boolean") {
          storedValues.set(key, storedValue);
        } else if (typeof defaultValue === "number") {
          const num = parseInt(storedValue as string, 10);
          storedValues.set(
            key,
            isNaN(num) ? String(defaultValue) : String(num)
          );
        } else {
          storedValues.set(key, storedValue);
        }
      }
    }
    setSettings((prev) => ({
      ...defaultSettings,
      ...prev,
      ...Object.fromEntries(storedValues),
    }));
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

  return (
    <SettingsContext.Provider
      value={{ settings, setSetting, loadSettings, settingsLoading }}
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
