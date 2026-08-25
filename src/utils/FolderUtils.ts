import StoreManager from "./StoreManager";

/**
 * Folder membership lives in `folder.qrCodes` on the folder object itself — there is
 * no per-code key pointing back at its folder. Anything that deletes a code has to
 * come through `removeQrFromAllFolders`, or the folder keeps a name that no longer
 * resolves to a file.
 *
 * Both functions here are deliberately outside `useFolderManager`: `QrUtils.deleteQrCode`
 * is not a React caller and cannot use the hook.
 */

/**
 * Folder ids seed from the clock, so two folders created in the same millisecond
 * would share an id and silently merge. The suffix makes that collision impractical.
 */
export function newFolderId(): string {
  return `folder-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Drops a code from every folder holding it. Called when the code is deleted, so no
 * folder is left counting a file that no longer exists — stale names inflate the
 * folder's displayed count and make "delete folder and its codes" try to delete a
 * missing file.
 */
export async function removeQrFromAllFolders(qrName: string): Promise<void> {
  const folders = await StoreManager.getFolders();
  const affected = folders.filter((f) => f.qrCodes.includes(qrName));

  await Promise.all(
    affected.map((folder) =>
      StoreManager.saveFolder({
        ...folder,
        qrCodes: folder.qrCodes.filter((name) => name !== qrName),
      })
    )
  );
}
