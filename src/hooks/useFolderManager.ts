import { useState, useEffect, useMemo } from "react";
import StoreManager from "../utils/StoreManager";
import {
  archiveQrCode,
  unarchiveQrCode,
  deleteQrCode,
} from "../utils/QrUtils";
import { newFolderId } from "../utils/FolderUtils";

interface UseFolderManagerProps {
  showArchived: boolean; // true for Archive page, false for QR page
}

export interface UseFolderManagerReturn {
  /** Folders belonging to this page only (archived or not, per `showArchived`). */
  folders: QrFolder[];
  /**
   * Every folder, both pages.
   *
   * Needed by anything that must not miss a folder on the *other* page — clearing a
   * code's previous folders on a move, above all. A code can legitimately sit in an
   * archived folder while itself being unarchived (unarchive one code inside an
   * archived folder), and scanning only `folders` there leaves it in two folders.
   */
  allFolders: QrFolder[];
  currentFolder: string | null;
  currentFolderData: QrFolder | null;
  setCurrentFolder: React.Dispatch<React.SetStateAction<string | null>>;
  createFolder: (name: string) => Promise<void>;
  addQrCodesToFolder: (qrNames: string[], folderId: string) => Promise<void>;
  removeQrCodesFromFolder: (qrNames: string[], folderId: string) => Promise<void>;
  archiveFolder: (folderId: string) => Promise<void>;
  unarchiveFolder: (folderId: string) => Promise<void>;
  deleteFolder: (folderId: string, deleteCodes: boolean) => Promise<void>;
  renameFolder: (folderId: string, newName: string) => Promise<void>;
  selectedFolders: QrFolder[];
  isFolderSelected: (folder: QrFolder) => boolean;
  toggleFolderSelection: (folder: QrFolder) => void;
  resetFolderSelection: () => void;
}

export function useFolderManager({
  showArchived,
}: UseFolderManagerProps): UseFolderManagerReturn {
  const [folders, setFolders] = useState<QrFolder[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(
    new Set()
  );

  // Load folders
  const loadFolders = async () => {
    const allFolders = await StoreManager.getFolders();
    setFolders(allFolders);
  };

  useEffect(() => {
    loadFolders();
  }, []);

  // Filter folders based on archived status
  // Defensive: filter out invalid entries and default archived to false for legacy folders
  const filteredFolders = useMemo(() => {
    return folders.filter(
      (f) => f && (f.archived ?? false) === showArchived
    );
  }, [folders, showArchived]);

  // Get current folder details
  const currentFolderData = useMemo(() => {
    if (!currentFolder) return null;
    return folders.find((f) => f.id === currentFolder) || null;
  }, [currentFolder, folders]);

  // Create folder
  const createFolder = async (name: string) => {
    const folder: QrFolder = {
      id: newFolderId(),
      name,
      createdAt: Date.now(),
      qrCodes: [],
      archived: showArchived, // Create in current context
    };
    await StoreManager.saveFolder(folder);
    await loadFolders();
  };

  // Add multiple QR codes to folder
  const addQrCodesToFolder = async (qrNames: string[], folderId: string) => {
    const folder = folders.find((f) => f.id === folderId);
    if (!folder) return;

    const toAdd = qrNames.filter((name) => !folder.qrCodes.includes(name));
    if (toAdd.length === 0) return;

    folder.qrCodes = [...folder.qrCodes, ...toAdd];
    await StoreManager.saveFolder(folder);
    await loadFolders();
  };

  // Remove multiple QR codes from folder
  const removeQrCodesFromFolder = async (
    qrNames: string[],
    folderId: string
  ) => {
    const folder = folders.find((f) => f.id === folderId);
    if (!folder) return;

    folder.qrCodes = folder.qrCodes.filter((name) => !qrNames.includes(name));
    await StoreManager.saveFolder(folder);
    await loadFolders();
  };

  // Archive folder (moves to archive page)
  const archiveFolder = async (folderId: string) => {
    const folder = folders.find((f) => f.id === folderId);
    if (!folder) return;

    // Archive the folder
    folder.archived = true;
    await StoreManager.saveFolder(folder);

    // Archive all QR codes in the folder
    await Promise.all(folder.qrCodes.map((qrName) => archiveQrCode(qrName)));

    await loadFolders();
  };

  // Unarchive folder (moves to QR page)
  const unarchiveFolder = async (folderId: string) => {
    const folder = folders.find((f) => f.id === folderId);
    if (!folder) return;

    // Unarchive the folder
    folder.archived = false;
    await StoreManager.saveFolder(folder);

    // Unarchive all QR codes in the folder
    await Promise.all(folder.qrCodes.map((qrName) => unarchiveQrCode(qrName)));

    await loadFolders();
  };

  // Delete folder
  // deleteCodes: when true, also delete all QR codes inside the folder from disk
  const deleteFolder = async (folderId: string, deleteCodes: boolean) => {
    const folder = folders.find((f) => f.id === folderId);
    if (folder && deleteCodes && folder.qrCodes.length > 0) {
      // allSettled, not all: one failed code deletion must not abort the loop and
      // leave the folder itself undeleted. The folder is being removed either way.
      await Promise.allSettled(
        folder.qrCodes.map((qrName) => deleteQrCode(qrName))
      );
    }
    await StoreManager.deleteFolder(folderId);
    setSelectedFolderIds((prev) => {
      const next = new Set(prev);
      next.delete(folderId);
      return next;
    });
    await loadFolders();
  };

  // Rename folder
  const renameFolder = async (folderId: string, newName: string) => {
    const folder = folders.find((f) => f.id === folderId);
    if (!folder) return;

    folder.name = newName;
    await StoreManager.saveFolder(folder);
    await loadFolders();
  };

  // Folder selection
  const selectedFolders = useMemo(
    () => filteredFolders.filter((f) => selectedFolderIds.has(f.id)),
    [filteredFolders, selectedFolderIds]
  );

  const isFolderSelected = (folder: QrFolder) =>
    selectedFolderIds.has(folder.id);

  const toggleFolderSelection = (folder: QrFolder) => {
    setSelectedFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(folder.id)) {
        next.delete(folder.id);
      } else {
        next.add(folder.id);
      }
      return next;
    });
  };

  const resetFolderSelection = () => setSelectedFolderIds(new Set());

  return {
    folders: filteredFolders,
    allFolders: folders,
    currentFolder,
    currentFolderData,
    setCurrentFolder,
    createFolder,
    addQrCodesToFolder,
    removeQrCodesFromFolder,
    archiveFolder,
    unarchiveFolder,
    deleteFolder,
    renameFolder,
    selectedFolders,
    isFolderSelected,
    toggleFolderSelection,
    resetFolderSelection,
  };
}
