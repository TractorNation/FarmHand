/**
 * Folder membership arithmetic for the QR and Archive pages.
 *
 * Pure and separate from `useQrPage` so it can be tested without a renderer — the
 * same reasoning as `qrSortFilter.ts`. This is the logic that decides which codes a
 * page shows and which folders a bulk action touches, and its failures are silent
 * (a code shown twice, or in two folders at once, rather than an error).
 */

/** Codes that belong to no folder — what the page root shows. */
export function rootCodes(
  visible: QrCode[],
  folders: QrFolder[]
): QrCode[] {
  return visible.filter(
    (qr) => !folders.some((folder) => folder.qrCodes.includes(qr.name))
  );
}

/** Codes inside one folder. A missing folder shows nothing rather than everything. */
export function folderCodes(
  visible: QrCode[],
  folderData: QrFolder | null
): QrCode[] {
  if (!folderData) return [];
  return visible.filter((qr) => folderData.qrCodes.includes(qr.name));
}

/**
 * The single folder holding every selected code, or null when that is ambiguous.
 *
 * This is a *superset* test: a folder qualifies if it contains all of the selection,
 * even if it also holds other codes. Null when nothing is selected, when no folder
 * holds the whole selection, or when two or more do — "Remove from folder" only
 * offers itself when there is one unambiguous target.
 */
export function findFolderContainingAll(
  folders: QrFolder[],
  selectedNames: string[]
): QrFolder | null {
  if (selectedNames.length === 0) return null;

  const names = new Set(selectedNames);
  const matching = folders.filter((folder) => {
    const folderCodes = new Set(folder.qrCodes);
    return [...names].every((name) => folderCodes.has(name));
  });

  return matching.length === 1 ? matching[0] : null;
}

export interface MovePlan {
  /** Names to strip from each source folder, so a code never sits in two. */
  removals: { folderId: string; names: string[] }[];
  /** The deduped set of names to add to the destination. */
  additions: string[];
}

/**
 * Works out which folders a move has to touch.
 *
 * Returned as a plan rather than executed inline so the membership arithmetic is
 * assertable on its own — the sequencing (clear sources, then add to the destination)
 * is what stops a code appearing in two folders, and it is easy to get subtly wrong.
 *
 * `folders` should be **every** folder, not just the current page's: a code can sit in
 * a folder belonging to the other page, and skipping those is what allows double
 * membership.
 */
export function planMove(
  folders: QrFolder[],
  targetFolderId: string,
  names: string[]
): MovePlan {
  const additions = [...new Set(names)];

  const removals = folders
    .filter((folder) => folder.id !== targetFolderId)
    .map((folder) => ({
      folderId: folder.id,
      names: additions.filter((name) => folder.qrCodes.includes(name)),
    }))
    .filter((removal) => removal.names.length > 0);

  return { removals, additions };
}
