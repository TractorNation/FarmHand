import { useMemo, useState } from "react";
import { useAsyncFetch } from "./useAsyncFetch";
import useDialog from "./useDialog";
import { useFolderManager } from "./useFolderManager";
import { useQrManager } from "./useQrManager";
import { deleteQrCode, fetchQrCodes } from "../utils/QrUtils";
import {
  findFolderContainingAll,
  folderCodes,
  planMove,
  rootCodes,
} from "../utils/folderPlan";

/**
 * Everything the QR page and the Archive page do identically.
 *
 * The two pages differ only in which half of the saved codes they show and which
 * bulk actions they offer. Everything else — `displayQrCodes`,
 * `folderContainingAllSelected`, every folder handler — is identical between them,
 * so it lives here once rather than being maintained in two places.
 *
 * Their *rendering* deliberately stays separate: one page has a scanner, export and
 * batch QR, the other has mass unarchive and delete. A shared shell would need a
 * dozen props and read worse than two explicit pages.
 */
export function useQrPage({ archived }: { archived: boolean }) {
  const [allQrCodes, loading, error, refetch] = useAsyncFetch(fetchQrCodes);

  const [activeQrCode, setActiveQrCode] = useState<QrCode | null>(null);
  const [activeFolderForAction, setActiveFolderForAction] =
    useState<QrFolder | null>(null);

  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const [qrDialogOpen, openQrDialog, closeQrDialog] = useDialog();
  const [sendToDialogOpen, openSendToDialog, closeSendToDialog] = useDialog();
  const [folderDialogOpen, openFolderDialog, closeFolderDialog] = useDialog();
  const [renameFolderDialogOpen, openRenameFolderDialog, closeRenameFolderDialog] =
    useDialog();
  const [deleteFolderDialogOpen, openDeleteFolderDialog, closeDeleteFolderDialog] =
    useDialog();

  const folderManager = useFolderManager({ showArchived: archived });

  /** The half of the saved codes this page is responsible for. */
  const visibleQrCodes = useMemo(
    () => allQrCodes?.filter((code) => Boolean(code.archived) === archived) ?? [],
    [allQrCodes, archived]
  );

  /**
   * At the root, codes that are in no folder; inside a folder, that folder's codes.
   * A code in a folder is deliberately hidden from the root so it appears once.
   */
  const displayQrCodes = useMemo(() => {
    if (!folderManager.currentFolder) {
      return rootCodes(visibleQrCodes, folderManager.folders);
    }

    return folderCodes(visibleQrCodes, folderManager.currentFolderData);
  }, [
    folderManager.currentFolder,
    folderManager.currentFolderData,
    folderManager.folders,
    visibleQrCodes,
  ]);

  const qrManager = useQrManager({ qrCodes: displayQrCodes });

  const notify = (message: string) => {
    setSuccessMessage(message);
    setSuccess(true);
  };

  /**
   * The single folder holding every selected code, if there is exactly one.
   *
   * Ambiguous when the selection spans folders, so "Remove from folder" only offers
   * itself when the target is unambiguous.
   */
  const folderContainingAllSelected = useMemo(
    () =>
      findFolderContainingAll(
        folderManager.folders,
        qrManager.selectedCodes.map((c) => c.name)
      ),
    [qrManager.selectedCodes, folderManager.folders]
  );

  const handleRemoveFromFolder = async () => {
    if (!folderContainingAllSelected || qrManager.selectedCodes.length === 0) {
      return;
    }

    const qrNames = qrManager.selectedCodes.map((c) => c.name);
    await folderManager.removeQrCodesFromFolder(
      qrNames,
      folderContainingAllSelected.id
    );

    notify(
      `Removed ${qrNames.length} code${qrNames.length !== 1 ? "s" : ""} from ${
        folderContainingAllSelected.name
      }`
    );
    qrManager.resetSelection();
    qrManager.toggleSelectionMode();
    refetch();
  };

  /**
   * Moves the selection into a folder.
   *
   * Selecting folders rather than codes moves their contents, which is what makes
   * "drag one folder into another" work. Source folders are cleared first so a code
   * never appears in two folders.
   */
  const executeMoveToFolder = async (folderId: string) => {
    if (
      qrManager.selectedCodes.length === 0 &&
      folderManager.selectedFolders.length === 0
    ) {
      return;
    }

    const qrNames =
      qrManager.selectedCodes.length > 0
        ? qrManager.selectedCodes.map((c) => c.name)
        : folderManager.selectedFolders.flatMap((f) => f.qrCodes);

    // Planned against *every* folder, not just this page's: a code can sit in a
    // folder on the other page, and skipping those left it in two folders at once.
    const { removals, additions } = planMove(
      folderManager.allFolders,
      folderId,
      qrNames
    );

    if (additions.length === 0) return;

    for (const removal of removals) {
      await folderManager.removeQrCodesFromFolder(removal.names, removal.folderId);
    }

    await folderManager.addQrCodesToFolder(additions, folderId);

    const folder = folderManager.allFolders.find((f) => f.id === folderId);
    notify(
      `Moved ${additions.length} code${
        additions.length !== 1 ? "s" : ""
      } to ${folder?.name ?? "folder"}`
    );

    qrManager.resetSelection();
    folderManager.resetFolderSelection();
    qrManager.toggleSelectionMode();
    closeSendToDialog();
    refetch();
  };

  const handleRenameFolder = (folder: QrFolder) => {
    setActiveFolderForAction(folder);
    openRenameFolderDialog();
  };

  const executeRenameFolder = async (newName: string) => {
    if (!activeFolderForAction) return;
    await folderManager.renameFolder(activeFolderForAction.id, newName);
    closeRenameFolderDialog();
    setActiveFolderForAction(null);
  };

  /**
   * @param promptWhenEmpty when false, an empty folder is deleted outright rather
   *   than asking a question with only one sensible answer.
   */
  const handleDeleteFolder = async (
    folder: QrFolder,
    promptWhenEmpty = true
  ) => {
    setActiveFolderForAction(folder);

    if (!promptWhenEmpty && folder.qrCodes.length === 0) {
      await folderManager.deleteFolder(folder.id, false);
      setActiveFolderForAction(null);
      return;
    }

    openDeleteFolderDialog();
  };

  const executeDeleteFolder = async (deleteOption: "codes" | "folder") => {
    if (!activeFolderForAction) return;

    if (deleteOption === "codes") {
      // Empty the folder but keep it.
      const codesToDelete = visibleQrCodes.filter((qr) =>
        activeFolderForAction.qrCodes.includes(qr.name)
      );
      await Promise.all(codesToDelete.map((c) => deleteQrCode(c.name)));
      await folderManager.removeQrCodesFromFolder(
        activeFolderForAction.qrCodes,
        activeFolderForAction.id
      );
    } else {
      await folderManager.deleteFolder(activeFolderForAction.id, true);
    }

    closeDeleteFolderDialog();
    setActiveFolderForAction(null);
    refetch();
  };

  /** Selecting a folder selects every code inside it, and deselecting clears them. */
  const handleSelectFolder = (folder: QrFolder, qrCodesInFolder: QrCode[]) => {
    const validCodes = qrCodesInFolder.filter(
      (qr) => Boolean(qr.archived) === archived
    );
    const selecting = !folderManager.isFolderSelected(folder);

    for (const qr of validCodes) {
      if (qrManager.codeIsSelected(qr) !== selecting) {
        qrManager.updateSelectedCodes(qr);
      }
    }
    folderManager.toggleFolderSelection(folder);
  };

  return {
    // data
    allQrCodes,
    visibleQrCodes,
    displayQrCodes,
    loading,
    error,
    refetch,

    // managers
    qrManager,
    folderManager,

    // active items
    activeQrCode,
    setActiveQrCode,
    activeFolderForAction,
    setActiveFolderForAction,

    // snackbar
    success,
    successMessage,
    notify,
    closeSuccess: () => setSuccess(false),

    // shared dialogs
    qrDialogOpen,
    openQrDialog,
    closeQrDialog,
    sendToDialogOpen,
    openSendToDialog,
    closeSendToDialog,
    folderDialogOpen,
    openFolderDialog,
    closeFolderDialog,
    renameFolderDialogOpen,
    openRenameFolderDialog,
    closeRenameFolderDialog,
    deleteFolderDialogOpen,
    openDeleteFolderDialog,
    closeDeleteFolderDialog,

    // shared behaviour
    folderContainingAllSelected,
    handleRemoveFromFolder,
    executeMoveToFolder,
    handleRenameFolder,
    executeRenameFolder,
    handleDeleteFolder,
    executeDeleteFolder,
    handleSelectFolder,
  };
}
