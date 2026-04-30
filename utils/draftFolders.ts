import { DraftFolder } from '../types';

export const sortDraftFolders = (folders: DraftFolder[]): DraftFolder[] =>
  [...folders].sort((a, b) => b.timestamp - a.timestamp);

export const upsertDraftFolder = (folders: DraftFolder[], folder: DraftFolder): DraftFolder[] =>
  sortDraftFolders([folder, ...folders.filter((item) => item.id !== folder.id)]);

export const removeDraftImagesFromFolder = (
  folders: DraftFolder[],
  folderId: string,
  imageIds: string[],
): DraftFolder[] => {
  const imageIdSet = new Set(imageIds);
  return sortDraftFolders(
    folders
      .map((folder) =>
        folder.id === folderId
          ? { ...folder, images: folder.images.filter((image) => !imageIdSet.has(image.id)) }
          : folder,
      )
      .filter((folder) => folder.id !== folderId || folder.images.length > 0),
  );
};
