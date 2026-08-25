import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve as resolvePath } from "node:path";

/**
 * Field images are the app's only consumer of the Tauri asset protocol, and the two
 * halves of that arrangement live in different files: `fieldImageUrl` builds an
 * `asset:` URL here, while whether the webview will honour that URL is decided by
 * `tauri.conf.json`. Nothing connects them at build time, so this file asserts both —
 * a config with the protocol off ships an app where every custom field image silently
 * refuses to load, which is exactly the bug this suite was written for.
 */

const stored = vi.hoisted(() => new Set<string>());

vi.mock("@tauri-apps/api/core", () => ({
  convertFileSrc: (path: string) => `asset://localhost/${encodeURIComponent(path)}`,
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/api/path", () => ({
  appLocalDataDir: async () => "/applocaldata",
  resolve: async (...parts: string[]) => parts.join("/"),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({ open: vi.fn() }));

vi.mock("@tauri-apps/plugin-fs", () => ({
  BaseDirectory: { AppLocalData: 1 },
  exists: async (path: string) => stored.has(path),
  readDir: async () => [],
}));

vi.mock("../assets/images/FieldDefault.png?url", () => ({ default: "/bundled-field.png" }));

const tauriConfig = JSON.parse(
  readFileSync(resolvePath(__dirname, "../../src-tauri/tauri.conf.json"), "utf8")
);

describe("asset protocol config", () => {
  it("is enabled", () => {
    // Defaults to false. With it off `convertFileSrc` still returns a well-formed URL
    // for a protocol nothing registered, so the failure surfaces as an image that
    // never loads rather than as an error anyone can act on.
    expect(tauriConfig.app.security.assetProtocol?.enable).toBe(true);
  });

  it("scopes the field image directory", () => {
    // An empty scope is the shipped default and denies every path, so enabling the
    // protocol without this is the same bug wearing a different hat.
    const scope: string[] = tauriConfig.app.security.assetProtocol?.scope ?? [];
    expect(scope.some((entry) => entry.includes("field-images"))).toBe(true);
  });
});

describe("resolveFieldImage", () => {
  beforeEach(() => {
    stored.clear();
  });

  it("prefers the schema's image over the global one", async () => {
    stored.add("field-images/schema.png");
    stored.add("field-images/global.png");
    const { resolveFieldImage } = await import("./FieldImage");

    const resolved = await resolveFieldImage("schema.png", "global.png");

    expect(resolved.source).toBe("schema");
    expect(resolved.fellBack).toBe(false);
    expect(resolved.url).toContain("schema.png");
  });

  it("falls back to the global image and flags it when the schema names a file this device lacks", async () => {
    // The QR case: a schema authored elsewhere routinely names an image the reader has
    // never seen, and the Auto screen still has to be drawable.
    stored.add("field-images/global.png");
    const { resolveFieldImage } = await import("./FieldImage");

    const resolved = await resolveFieldImage("absent.png", "global.png");

    expect(resolved.source).toBe("global");
    expect(resolved.fellBack).toBe(true);
    expect(resolved.url).toContain("global.png");
  });

  it("falls back to the bundled field when nothing is stored", async () => {
    const { resolveFieldImage, DEFAULT_FIELD_IMAGE_URL } = await import("./FieldImage");

    const resolved = await resolveFieldImage(undefined, "");

    expect(resolved.source).toBe("default");
    expect(resolved.fellBack).toBe(false);
    expect(resolved.url).toBe(DEFAULT_FIELD_IMAGE_URL);
  });

  it("does not flag a fallback the schema never asked for", async () => {
    const { resolveFieldImage } = await import("./FieldImage");

    // fellBack means "your schema asked for something specific and did not get it",
    // not "no custom image is configured" — the alert would otherwise cry wolf on
    // every default install.
    expect((await resolveFieldImage(undefined, "absent.png")).fellBack).toBe(false);
  });
});
