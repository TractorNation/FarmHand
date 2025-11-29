import { Store } from "@tauri-apps/plugin-store";

let store: Store | null = null;
let initPromise: Promise<void> | null = null;

const StoreManager = {
  async init() {
    if (!initPromise) {
      initPromise = (async () => {
        try {
          store = await Store.load("store.json");
          console.log("Store created");
        } catch (e) {
          console.error("Failed to initialize store", e);
          throw e;
        }
      })();
    }
    return initPromise;
  },

  async ensureInit() {
    if (!store) {
      await this.init();
    }
  },

  async getAll(keys: string[]): Promise<Map<string, string | undefined>> {
    try {
      await this.ensureInit();
      if (!store) return new Map();

      const result: Map<string, string | undefined> = new Map();
      for (const key of keys) {
        const value = await store.get(key);
        result.set(key, value as string | undefined);
      }
      return result;
    } catch (e) {
      console.error("Failed to get all items", e);
      throw e;
    }
  },

  async get(key: string): Promise<string | undefined> {
    try {
      await this.ensureInit();
      if (!store) return undefined;

      const value = await store.get(key);
      return value as string | undefined;
    } catch (e) {
      console.error("Failed to get item from store", e);
      throw e;
    }
  },

  async set(key: string, value: string) {
    try {
      await this.ensureInit();
      if (!store) throw new Error("Store not initialized");
      await store.set(key, value);
      console.log("Item added to store", key, value);
    } catch (e) {
      console.error("Failed to set value in store", e);
      throw e;
    }
  },

  async remove(key: string) {
    try {
      await this.ensureInit();
      if (!store) throw new Error("Store not initialized");
      await store.delete(key);
    } catch (e) {
      console.error("Failed to remove key from store", e);
      throw e;
    }
  },

  async clear() {
    try {
      await this.ensureInit();
      if (!store) throw new Error("Store not initialized");
      await store.clear();
    } catch (e) {
      console.error("Failed to clear store", e);
      throw e;
    }
  },

  async getLastSchema(): Promise<string | undefined> {
    let name = await this.get(StoreKeys.settings.LAST_SCHEMA_NAME);
    return name ?? undefined;
  },

  async setLastSchema(name: string) {
    await this.set(StoreKeys.settings.LAST_SCHEMA_NAME, name);
  },

  async archiveQrCode(name: string) {
    await this.set(StoreKeys.code.archived(name), "true");
  },

  async unarchiveQrCode(name: string) {
    await this.remove(StoreKeys.code.archived(name));
  },
  async isQrCodeArchived(name: string): Promise<boolean> {
    const value = await this.get(StoreKeys.code.archived(name));
    return value === "true";
  },
};

export default StoreManager;

export const StoreKeys = {
  settings: {
    LAST_SCHEMA_NAME: "setings::LAST_SCHEMA_NAME",
    DEVICE_ID: "settings::DEVICE_ID",
    THEME: "settings::THEME",
    EXPECTED_DEVICES_COUNT: "settings::EXPECTED_DEVICES_COUNT",
    LEAD_SCOUT_ONLY: "settings::LEAD_SCOUT_ONLY",
    COLOR_THEME: "settings::COLOR_THEME"
  },
  code: {
    archived: (name: string) => `code::${name}::archived`,
  },
  match: {
    field: (name: string) => `match::field::${name}`,
  },
  analysis: {
    byId: (id: number) => `analysis::${id}`,
    list: "analyses::list",
  },
};
