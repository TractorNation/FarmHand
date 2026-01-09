import { useState, useEffect, useMemo } from "react";
import StoreManager from "../utils/StoreManager";
import { archiveQrCode, unarchiveQrCode } from "../utils/QrUtils";

interface UseFolderManagerProps {
  showArchived: boolean; // true for Archive page, false for QR page
}

export function useFolderManager({ showArchived }: UseFolderManagerProps) {
  const [folders, setFolders] = useState<QrFolder[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);

  // Load folders
  const loadFolders = async () => {
    const allFolders = await StoreManager.getFolders();
    setFolders(allFolders);
  };

  useEffect(() => {
    loadFolders();
  }, []);

  // Filter folders based on archived status
  const filteredFolders = useMemo(() => {
    return folders.filter((f) => f.archived === showArchived);
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

  // Remove QR from folder
  const removeQrFromFolder = async (qrName: string, folderId: string) => {
    const folder = folders.find((f) => f.id === folderId);
    if (!folder) return;

    folder.qrCodes = folder.qrCodes.filter((name) => name !== qrName);
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
  const deleteFolder = async (folderId: string) => {
    await StoreManager.deleteFolder(folderId);
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

  return {
    folders: filteredFolders,
    currentFolder,
    currentFolderData,
    setCurrentFolder,
    createFolder,
    addQrToFolder,
    removeQrFromFolder,
    archiveFolder,
    unarchiveFolder,
    deleteFolder,
    renameFolder,
    refresh: loadFolders,
  };
}
