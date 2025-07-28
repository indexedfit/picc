import { useEffect, useState } from "react";
import type { Helia } from "helia";
import {
  loadManifest,
  Manifest,
  saveManifestToOpfs,
  persistManifestToIpfs,
} from "../lib/manifest";
import MediaThumb from "./MediaThumb";
import TreeView from "./TreeView";
import MoveFileDropdown from "./MoveFileDropdown";
import FullscreenViewer from "./FullscreenViewer";

interface Props {
  helia: Helia;
  onManifestChange: (m: Manifest, newCid: string | null) => void;
}

export default function GalleryView({ helia, onManifestChange }: Props) {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | undefined>(undefined);
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);
  const [moveFileId, setMoveFileId] = useState<string | null>(null);

  useEffect(() => {
    (async () => setManifest(await loadManifest()))();
  }, []);

  // Close move dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside() {
      setMoveFileId(null);
    }
    if (moveFileId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [moveFileId]);

  async function addEntries(
    entries: {
      id: string;
      cid: string;
      name: string;
      size?: number;
      mime?: string;
    }[],
  ) {
    if (!manifest) return;
    const now = new Date().toISOString();
    const next: Manifest = { ...manifest, files: { ...manifest.files } };

    for (const e of entries) {
      next.files[e.id] = {
        id: e.id,
        cid: e.cid,
        name: e.name,
        path: selectedPath,
        size: e.size,
        mime: e.mime,
        addedAt: now,
      };
    }

    await saveManifestToOpfs(next);
    const rootCid = await persistManifestToIpfs(helia, next);
    setManifest(next);
    onManifestChange(next, rootCid);
  }

  async function removeEntry(id: string) {
    if (!manifest) return;
    const file = manifest.files[id];
    if (!file) return;
    const now = new Date().toISOString();
    const next: Manifest = {
      ...manifest,
      files: {
        ...manifest.files,
        [id]: { ...file, deleted: true, updatedAt: now },
      },
    };
    await saveManifestToOpfs(next);
    const rootCid = await persistManifestToIpfs(helia, next);
    setManifest(next);
    onManifestChange(next, rootCid);
  }

  async function moveFile(fileId: string, targetPath: string | undefined) {
    if (!manifest) return;
    const file = manifest.files[fileId];
    if (!file) return;
    
    const now = new Date().toISOString();
    const next: Manifest = {
      ...manifest,
      files: {
        ...manifest.files,
        [fileId]: { ...file, path: targetPath, updatedAt: now },
      },
    };
    
    await saveManifestToOpfs(next);
    const rootCid = await persistManifestToIpfs(helia, next);
    setManifest(next);
    onManifestChange(next, rootCid);
  }

  async function createFolder(name: string, parentPath?: string) {
    if (!manifest) return;
    
    const fullPath = parentPath ? `${parentPath}/${name}` : name;
    const now = new Date().toISOString();
    
    const next: Manifest = {
      ...manifest,
      folders: {
        ...(manifest.folders || {}),
        [fullPath]: {
          id: fullPath,
          name,
          path: parentPath,
          createdAt: now,
        },
      },
    };
    
    await saveManifestToOpfs(next);
    const rootCid = await persistManifestToIpfs(helia, next);
    setManifest(next);
    onManifestChange(next, rootCid);
    
    // Auto-open the new folder
    setSelectedPath(fullPath);
  }
  
  async function updateFolder(path: string, description: string) {
    if (!manifest || !manifest.folders?.[path]) return;
    
    const now = new Date().toISOString();
    const next: Manifest = {
      ...manifest,
      folders: {
        ...manifest.folders,
        [path]: {
          ...manifest.folders[path],
          description,
          updatedAt: now,
        },
      },
    };
    
    await saveManifestToOpfs(next);
    const rootCid = await persistManifestToIpfs(helia, next);
    setManifest(next);
    onManifestChange(next, rootCid);
  }

  if (!manifest) return <p className="text-gray-500 font-mono">Loading manifest…</p>;

  const visible = Object.values(manifest.files).filter(
    (f) => !f.deleted && f.path === selectedPath
  );
  
  const currentFolder = selectedPath ? manifest.folders?.[selectedPath] : null;

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-8rem)]">
      {/* Left sidebar with folder tree - mobile responsive */}
      <aside className="w-full lg:w-64 folder-tree overflow-y-auto lg:h-full h-64 lg:border-r border-b lg:border-b-0 border-gray-200">
        <TreeView
          manifest={manifest}
          selectedPath={selectedPath}
          onSelectFolder={setSelectedPath}
          onCreateFolder={createFolder}
          onUpdateFolder={updateFolder}
        />
      </aside>
      
      {/* Main content area */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6">
        {/* Breadcrumb */}
        <div className="mb-4">
          <h2 className="text-lg font-medium text-gray-700">
            {selectedPath ? selectedPath.split('/').join(' / ') : 'All Photos'}
          </h2>
          <p className="text-sm text-gray-500">{visible.length} items</p>
        </div>
        
        {currentFolder?.description && (
          <div className="bg-gray-50 border border-gray-200 rounded p-3 text-sm text-gray-600 italic mb-4">
            {currentFolder.description}
          </div>
        )}
        
        {/* Image grid */}
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {visible.map((f, index) => (
            <div key={f.id} className="group relative">
              <div 
                className="cursor-pointer"
                onClick={() => setFullscreenIndex(index)}
              >
                <MediaThumb helia={helia} cid={f.cid} name={f.name} />
              </div>
              
              <div className="flex items-center justify-between text-xs mt-1 px-1">
                <div className="truncate text-gray-600" title={f.name}>
                  {f.name}
                </div>
                <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMoveFileId(f.id);
                    }}
                    className="text-blue-600 hover:text-blue-700 text-sm"
                    title="Move to folder"
                  >
                    📁
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeEntry(f.id);
                    }}
                    className="text-red-600 hover:text-red-700"
                    title="Delete"
                  >
                    ×
                  </button>
                </div>
              </div>
              
              {/* Move dropdown */}
              {moveFileId === f.id && (
                <div className="relative">
                  <MoveFileDropdown
                    manifest={manifest}
                    currentPath={f.path}
                    onMove={(targetPath) => {
                      moveFile(f.id, targetPath);
                      setMoveFileId(null);
                    }}
                    onCancel={() => setMoveFileId(null)}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {visible.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p className="mb-2">No photos in this folder</p>
            <p className="text-sm">Click "Add pics" below to get started</p>
          </div>
        )}

        {/* Upload area */}
        <div className="mt-8 border-t pt-6">
          <Uploader helia={helia} onAdd={addEntries} />
        </div>
      </div>
      
      {/* Fullscreen viewer */}
      {fullscreenIndex !== null && (
        <FullscreenViewer
          helia={helia}
          files={visible}
          currentIndex={fullscreenIndex}
          onClose={() => setFullscreenIndex(null)}
          onNavigate={setFullscreenIndex}
        />
      )}
    </div>
  );
}

import FilePicker from "./FilePicker";
function Uploader({
  helia,
  onAdd,
}: {
  helia: Helia;
  onAdd: (e: any[]) => void;
}) {
  return (
    <div className="mt-4">
      <FilePicker helia={helia} onAdded={onAdd} />
    </div>
  );
}
