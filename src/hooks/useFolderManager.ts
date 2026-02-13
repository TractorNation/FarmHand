import { useState, useEffect, useMemo } from "react";
import StoreManager from "../utils/StoreManager";
import {
  archiveQrCode,
  unarchiveQrCode,
  deleteQrCode,
} from "../utils/QrUtils";

interface UseFolderManagerProps {
  showArchived: boolean; // true for Archive page, false for QR page
}

export interface UseFolderManagerReturn {
  folders: QrFolder[];
  currentFolder: string | null;
  currentFolderData: QrFolder | null;
  setCurrentFolder: React.Dispatch<React.SetStateAction<string | null>>;
  createFolder: (name: string) => Promise<void>;
  addQrToFolder: (qrName: string, folderId: string) => Promise<void>;
  addQrCodesToFolder: (qrNames: string[], folderId: string) => Promise<void>;
  removeQrFromFolder: (qrName: string, folderId: string) => Promise<void>;
  removeQrCodesFromFolder: (qrNames: string[], folderId: string) => Promise<void>;
  archiveFolder: (folderId: string) => Promise<void>;
  unarchiveFolder: (folderId: string) => Promise<void>;
  deleteFolder: (folderId: string, deleteCodes: boolean) => Promise<void>;
  renameFolder: (folderId: string, newName: string) => Promise<void>;
  selectedFolders: QrFolder[];
  isFolderSelected: (folder: QrFolder) => boolean;
  toggleFolderSelection: (folder: QrFolder) => void;
  resetFolderSelection: () => void;
  refresh: () => Promise<void>;
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
      id: `folder-${Date.now()}`,
      name,
      createdAt: Date.now(),
      qrCodes: [],
      archived: showArchived, // Create in current context
    };
    await StoreManager.saveFolder(folder);
    await loadFolders();
  };

  // Add QR to folder
  const addQrToFolder = async (qrName: string, folderId: string) => {
    const folder = folders.find((f) => f.id === folderId);
    if (!folder || folder.qrCodes.includes(qrName)) return;

    folder.qrCodes.push(qrName);
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

  // Remove QR from folder
  const removeQrFromFolder = async (qrName: string, folderId: string) => {
    const folder = folders.find((f) => f.id === folderId);
    if (!folder) return;

    folder.qrCodes = folder.qrCodes.filter((name) => name !== qrName);
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
    await Promise.all(
      folder.qrCodes.map((qrName) => {
        const qr = { name: qrName } as QrCode;
        return archiveQrCode(qr);
      })
    );

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
    await Promise.all(
      folder.qrCodes.map((qrName) => {
        const qr = { name: qrName } as QrCode;
        return unarchiveQrCode(qr);
      })
    );

    await loadFolders();
  };

  // Delete folder
  // deleteCodes: when true, also delete all QR codes inside the folder from disk
  const deleteFolder = async (folderId: string, deleteCodes: boolean) => {
    const folder = folders.find((f) => f.id === folderId);
    if (folder && deleteCodes && folder.qrCodes.length > 0) {
      await Promise.all(
        folder.qrCodes.map((qrName) =>
          deleteQrCode({ name: qrName } as QrCode)
        )
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
    currentFolder,
    currentFolderData,
    setCurrentFolder,
    createFolder,
    addQrToFolder,
    addQrCodesToFolder,
    removeQrFromFolder,
    removeQrCodesFromFolder,
    archiveFolder,
    unarchiveFolder,
    deleteFolder,
    renameFolder,
    selectedFolders,
    isFolderSelected,
    toggleFolderSelection,
    resetFolderSelection,
    refresh: loadFolders,
  };
}
