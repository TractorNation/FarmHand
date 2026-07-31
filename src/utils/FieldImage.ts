import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { appLocalDataDir, resolve } from "@tauri-apps/api/path";
import { BaseDirectory, exists, readDir } from "@tauri-apps/plugin-fs";

/**
 * Playing field images used as the backdrop for auto-path drawing.
 *
 * Images are copied into $APPLOCALDATA/field-images/ and referenced by filename.
 * That indirection matters because a schema's fieldImageKey travels inside a schema
 * QR code: the receiving device will not have the file, so every lookup must fall
 * back rather than fail.
 */

export const FIELD_IMAGE_DIR = "field-images";

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

export interface ResolvedFieldImage {
  /** Renderable URL, or null when neither key resolved and no image is available. */
  url: string | null;
  /** Which key actually supplied the image. */
  source: "schema" | "global" | "none";
  /**
   * True when the schema asked for an image this device does not have and we fell
   * back. The UI surfaces this so the discrepancy is visible rather than silent.
   */
  fellBack: boolean;
}

/**
 * Three-step resolution: schema override → global setting → nothing.
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
    return { url: await fieldImageUrl(schemaKey), source: "schema", fellBack: false };
  }

  const requestedButMissing = Boolean(schemaKey);

  if (globalKey && (await fieldImageExists(globalKey))) {
    return {
      url: await fieldImageUrl(globalKey),
      source: "global",
      fellBack: requestedButMissing,
    };
  }

  return { url: null, source: "none", fellBack: requestedButMissing };
}
