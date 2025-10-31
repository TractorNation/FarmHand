import { Store } from "@tauri-apps/plugin-store";

let store: Store | null = null;
let isTauri = true;
let initPromise: Promise<void> | null = null;

const checkTauriEnvironment = () => {
  return typeof window !== "undefined" && "__TAURI__" in window;
};

const StoreManager = {
  async init() {
    isTauri = checkTauriEnvironment();

    if (isTauri) {
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
    }
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
      if (isTauri) {
        const value = await store.get(key);
        return value as string | undefined;
      } else {
        const value = localStorage.getItem(key);
        return value ?? undefined;
      }
    } catch (e) {
      console.error("Failed to get item from store", e);
      return undefined;
    }
  },

  async set(key: string, value: string) {
    try {
      await this.ensureInit();
      if (!store) throw new Error("Store not initialized");
      if (isTauri) {
        await store.set(key, value);
        console.log("Item added to store", key, value);
      } else {
        localStorage.setItem(key, value);
        console.log("item added to localStorage", key, value);
      }
    } catch (e) {
      console.error("Failed to set value in store", e);
    }
  },

  async remove(key: string) {
    try {
      await this.ensureInit();
      if (!store) throw new Error("Store not initialized");
      if (isTauri) {
        await store.delete(key);
      } else {
        localStorage.removeItem(key);
        console.log("item removed from localstorage", key);
      }
    } catch (e) {
      console.error("Failed to remove key from store", e);
    }
  },

  async clear() {
    try {
      await this.ensureInit();
      if (!store) throw new Error("Store not initialized");
      if (isTauri) {
        await store.clear();
      } else {
        localStorage.clear();
      }
    } catch (e) {
      console.error("Failed to clear store", e);
    }
  },

  async getLastSchema(): Promise<string | undefined> {
    let name = null;
    if (isTauri) {
      name = await this.get("lastSchemaName");
    } else {
      name = localStorage.getItem("lastSchemaName");
    }
    return name ?? undefined;
  },

  async setLastSchema(name: string) {
    if (isTauri) {
      await this.set("lastSchemaName", name);
    } else {
      localStorage.setItem("lastSchemaName", name);
    }
  },
};

export default StoreManager;
