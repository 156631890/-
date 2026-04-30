import { describe, expect, it } from 'vitest';
import { DraftFolder } from '../types';
import { removeDraftImagesFromFolder, sortDraftFolders, upsertDraftFolder } from './draftFolders';

const folder = (patch: Partial<DraftFolder>): DraftFolder => ({
  id: patch.id || 'folder-1',
  name: patch.name || 'Shop',
  supplier: patch.supplier || { companyName: '', contactPerson: '', phone: '', address: '' },
  images: patch.images || [],
  timestamp: patch.timestamp || 1,
});

describe('draft folder state helpers', () => {
  it('upserts draft folders and sorts newest first', () => {
    const older = folder({ id: 'older', timestamp: 1 });
    const newer = folder({ id: 'newer', timestamp: 2 });

    expect(upsertDraftFolder([older], newer)).toEqual([newer, older]);
    expect(upsertDraftFolder([older], { ...older, name: 'Updated', timestamp: 3 })[0].name).toBe('Updated');
  });

  it('removes processed draft images and drops empty folders', () => {
    const folders = [
      folder({
        id: 'folder-1',
        images: [
          { id: 'image-1', url: 'data:image/jpeg;base64,a', timestamp: 1 },
          { id: 'image-2', url: 'data:image/jpeg;base64,b', timestamp: 2 },
        ],
      }),
    ];

    expect(removeDraftImagesFromFolder(folders, 'folder-1', ['image-1'])[0].images.map((image) => image.id)).toEqual(['image-2']);
    expect(removeDraftImagesFromFolder(folders, 'folder-1', ['image-1', 'image-2'])).toEqual([]);
  });

  it('keeps unrelated empty draft folders when cleaning one folder', () => {
    const unrelatedEmptyFolder = folder({ id: 'empty', images: [] });
    const activeFolder = folder({
      id: 'active',
      images: [{ id: 'image-1', url: 'data:image/jpeg;base64,a', timestamp: 1 }],
    });

    expect(removeDraftImagesFromFolder([unrelatedEmptyFolder, activeFolder], 'active', ['image-1'])).toEqual([unrelatedEmptyFolder]);
  });

  it('sorts draft folders newest first without mutating the original list', () => {
    const original = [folder({ id: 'a', timestamp: 1 }), folder({ id: 'b', timestamp: 3 })];

    expect(sortDraftFolders(original).map((item) => item.id)).toEqual(['b', 'a']);
    expect(original.map((item) => item.id)).toEqual(['a', 'b']);
  });
});
