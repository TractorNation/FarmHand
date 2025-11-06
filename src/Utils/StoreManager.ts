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
};

export default StoreManager;

export const StoreKeys = {
  settings: {
    LAST_SCHEMA_NAME: "LAST_SCHEMA_NAME",
  },

  match: {
    field: (name: string) => `match::field::${name}`,
  },
};
