import StoreManager from "./StoreManager";

export async function createFolder(
  name: string,
  archived: boolean
): Promise<QrFolder> {
  const folder: QrFolder = {
    id: `folder-${Date.now()}`,
    name,
    createdAt: Date.now(),
    qrCodes: [],
    archived,
  };

  await StoreManager.saveFolder(folder);
  return folder;
}

export async function addQrToFolder(qrName: string, folderId: string) {
  const folders = await StoreManager.getFolders();
  const folder = folders.find((f) => f.id === folderId);
  if (!folder) return;

  if (!folder.qrCodes.includes(qrName)) {
    folder.qrCodes.push(qrName);
    await StoreManager.saveFolder(folder);
  }
}

export async function removeQrFromFolder(qrName: string, folderId: string) {
  const folders = await StoreManager.getFolders();
  const folder = folders.find((f) => f.id === folderId);
  if (!folder) return;

  folder.qrCodes = folder.qrCodes.filter((name) => name !== qrName);
  await StoreManager.saveFolder(folder);
}
