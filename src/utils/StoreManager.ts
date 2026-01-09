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

  async markQrCodeAsScanned(name: string) {
    await this.set(StoreKeys.code.scanned(name), "true");
  },

  async markQrCodeAsUnscanned(name: string) {
    await this.remove(StoreKeys.code.scanned(name));
  },

  async isQrCodeScanned(name: string): Promise<boolean> {
    const value = await this.get(StoreKeys.code.scanned(name));
    return value === "true";
  },

  async getTbaEventData(): Promise<EventData | null> {
    try {
      const data = await this.get(StoreKeys.tba.EVENT_DATA);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error("Failed to get TBA event data", e);
      return null;
    }
  },

  async setTbaEventData(eventData: EventData) {
    await this.set(StoreKeys.tba.EVENT_DATA, JSON.stringify(eventData));
  },

  async clearTbaEventData() {
    await this.remove(StoreKeys.tba.EVENT_DATA);
  },

  async getCachedEvents() {
    try {
      const data = await this.get(StoreKeys.tba.CACHED_EVENTS);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },

  async setCachedEvents(events: TbaEvent[]) {
    await this.set(StoreKeys.tba.CACHED_EVENTS, JSON.stringify(events));
  },

  async clearCachedEvents() {
    await this.remove(StoreKeys.tba.CACHED_EVENTS);
  },

  async getFolders(): Promise<QrFolder[]> {
    const listData = await this.get(StoreKeys.folders.list);

    if (!listData) return [];

    const folderIds = JSON.parse(listData);

    const folders = await Promise.all(
      folderIds.map(async (id: string) => {
        const data = await this.get(StoreKeys.folders.byId(id));
        return data ? JSON.parse(data) : null;
      })
    );

    return folders;
  },

  async saveFolder(folder: QrFolder) {
    await this.set(StoreKeys.folders.byId(folder.id), JSON.stringify(folder));

    const folders = await this.getFolders();
    const ids = folders.map((f) => f.id);
    if (!ids.includes(folder.id)) {
      ids.push(folder.id);
    }
    await this.set(StoreKeys.folders.list, JSON.stringify(ids));
  },

  async deleteFolder(folderId: string) {
    await this.remove(StoreKeys.folders.byId(folderId));

    const folders = await this.getFolders();
    const ids = folders.filter((f) => f.id !== folderId).map((f) => f.id);
    await this.set(StoreKeys.folders.list, JSON.stringify(ids));
  },
};

export default StoreManager;

export const StoreKeys = {
  app: {
    CACHED_VERSION: "app::CACHED_VERSION",
    LAST_VERSION_CHECK: "app::LAST_VERSION_CHECK",
  },
  settings: {
    LAST_SCHEMA_NAME: "settings::LAST_SCHEMA_NAME",
    DEVICE_ID: "settings::DEVICE_ID",
    THEME: "settings::THEME",
    TBA_API_KEY: "settings::TBA_API_KEY",
    TBA_EVENT_KEY: "settings::TBA_EVENT_KEY",
    EXPECTED_DEVICES_COUNT: "settings::EXPECTED_DEVICES_COUNT",
    LEAD_SCOUT_ONLY: "settings::LEAD_SCOUT_ONLY",
    AUTOSAVE_ON_COMPLETE: "settings::AUTOSAVE_ON_COMPLETE",
    COLOR_THEME: "settings::COLOR_THEME",
  },
  code: {
    archived: (name: string) => `code::${name}::archived`,
    scanned: (name: string) => `code::${name}::scanned`,
    putInFolder: (name: string) => `code::${name}::folder`,
  },
  folders: {
    list: "folders::list",
    byId: (id: string) => `folders::${id}`,
  },
  match: {
    field: (name: string) => `match::field::${name}`,
  },
  analysis: {
    byId: (id: number) => `analysis::${id}`,
    list: "analyses::list",
    pinned: (chartId: string) => `analysis::${chartId}::pinned`,
  },
  tba: {
    EVENT_DATA: "tba::EVENT_DATA",
    EVENT_KEY: "tba::EVENT_KEY",
    CACHED_EVENTS: "tba::CACHED_EVENTS",
  },
};
