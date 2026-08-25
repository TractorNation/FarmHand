import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { appLocalDataDir, resolve } from "@tauri-apps/api/path";
import { BaseDirectory, exists, readDir } from "@tauri-apps/plugin-fs";
import defaultFieldUrl from "../assets/images/FieldDefault.png?url";

/**
 * Playing field images used as the backdrop for auto-path drawing.
 *
 * Images are copied into $APPLOCALDATA/field-images/ and referenced by filename.
 * That indirection matters because a schema's fieldImageKey travels inside a schema
 * QR code: the receiving device will not have the file, so every lookup must fall
 * back rather than fail.
 */

export const FIELD_IMAGE_DIR = "field-images";

/**
 * Field bundled with the app, drawn when no stored image resolves.
 *
 * Being a build asset rather than a file in app storage is what lets it back every
 * failure path — a fresh install, a cleared setting, or a schema naming an image this
 * device has never seen all still get a real field to draw on.
 */
export const DEFAULT_FIELD_IMAGE_URL: string = defaultFieldUrl;

const ALLOWED_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "gif", "bmp"];

/** Strips anything that could escape the directory or upset the filesystem. */
function sanitizeKey(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/^\.+/, "");
}

/**
 * Prompts for an image and copies it into app storage.
 *
 * @returns the stored key (filename), or null if the user cancelled.
 */
export async function pickFieldImage(): Promise<string | null> {
  const picked = await open({
    multiple: false,
    directory: false,
    filters: [{ name: "Images", extensions: ALLOWED_EXTENSIONS }],
  });

  if (typeof picked !== "string") return null;

  const baseName = picked.split(/[\\/]/).pop() ?? "field.png";
  const key = sanitizeKey(baseName);
  const destDir = await resolve(await appLocalDataDir(), FIELD_IMAGE_DIR);

  // A Rust command rather than plugin-fs: the fs capability scope is limited to
  // $APPLOCALDATA, so reading the user's chosen path from the webview is denied.
  await invoke<string>("import_field_image", {
    srcPath: picked,
    destDir,
    destName: key,
  });

  return key;
}

/** Lists the field images already stored on this device. */
export async function listFieldImages(): Promise<string[]> {
  const dirExists = await exists(FIELD_IMAGE_DIR, {
    baseDir: BaseDirectory.AppLocalData,
  });
  if (!dirExists) return [];

  const entries = await readDir(FIELD_IMAGE_DIR, {
    baseDir: BaseDirectory.AppLocalData,
  });

  return entries
    .filter((entry) => {
      const ext = entry.name.split(".").pop()?.toLowerCase() ?? "";
      return entry.isFile && ALLOWED_EXTENSIONS.includes(ext);
    })
    .map((entry) => entry.name);
}

export async function fieldImageExists(key: string): Promise<boolean> {
  if (!key) return false;
  return await exists(`${FIELD_IMAGE_DIR}/${key}`, {
    baseDir: BaseDirectory.AppLocalData,
  });
}

/** Converts a stored key into a URL the webview can render. */
export async function fieldImageUrl(key: string): Promise<string | null> {
  if (!key) return null;
  const path = await resolve(await appLocalDataDir(), FIELD_IMAGE_DIR, key);
  return convertFileSrc(path);
}

/**
 * Decodes a URL into an image, or null if the webview refuses it.
 *
 * An asset: URL can name a file that genuinely exists and still fail to load — the
 * protocol has to be enabled in tauri.conf.json and the path has to sit inside its
 * scope. Callers that only wire up onload never learn that happened: the canvas paints
 * its background colour and reads as an empty field rather than a broken one.
 */
export function loadImageElement(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export interface ResolvedFieldImage {
  /** Renderable URL. Never empty — the bundled default backs every other case. */
  url: string;
  /** Which key actually supplied the image. */
  source: "schema" | "global" | "default";
  /**
   * True when the schema asked for an image this device does not have and we fell
   * back. The UI surfaces this so the discrepancy is visible rather than silent.
   */
  fellBack: boolean;
}

/**
 * Three-step resolution: schema override → global setting → bundled default.
 *
 * The fallback is the point. Schemas move between devices by QR code, so a
 * fieldImageKey routinely names a file the reader has never seen; the Auto screen
 * must still be usable when that happens.
 */
export async function resolveFieldImage(
  schemaKey: string | undefined,
  globalKey: string | undefined
): Promise<ResolvedFieldImage> {
  if (schemaKey && (await fieldImageExists(schemaKey))) {
    return {
      url: (await fieldImageUrl(schemaKey)) ?? DEFAULT_FIELD_IMAGE_URL,
      source: "schema",
      fellBack: false,
    };
  }

  const requestedButMissing = Boolean(schemaKey);

  if (globalKey && (await fieldImageExists(globalKey))) {
    return {
      url: (await fieldImageUrl(globalKey)) ?? DEFAULT_FIELD_IMAGE_URL,
      source: "global",
      fellBack: requestedButMissing,
    };
  }

  return {
    url: DEFAULT_FIELD_IMAGE_URL,
    source: "default",
    fellBack: requestedButMissing,
  };
}
