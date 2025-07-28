import { useState } from "react";
import type { Manifest } from "../lib/manifest";

interface Props {
  manifest: Manifest;
  currentPath?: string;
  onMove: (targetPath: string | undefined) => void;
  onCancel: () => void;
}

export default function MoveFileDropdown({ manifest, currentPath, onMove, onCancel }: Props) {
  const [selectedPath, setSelectedPath] = useState<string | undefined>(undefined);
  
  // Get all folders except the current one
  const availableFolders = Object.entries(manifest.folders || {})
    .filter(([path, _folder]) => !_folder.deleted && path !== currentPath)
    .sort(([a], [b]) => a.localeCompare(b));

  return (
    <div 
      className="absolute top-full left-0 z-10 bg-white border border-gray-300 rounded shadow-lg p-2 min-w-48"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="text-sm font-semibold mb-2">Move to folder:</div>
      
      <div className="space-y-1 max-h-40 overflow-y-auto">
        <button
          onClick={() => setSelectedPath(undefined)}
          className={`w-full text-left px-2 py-1 text-sm rounded hover:bg-gray-100 ${
            selectedPath === undefined ? 'bg-blue-50' : ''
          }`}
        >
          📁 Root
        </button>
        
        {availableFolders.map(([path, _folder]) => (
          <button
            key={path}
            onClick={() => setSelectedPath(path)}
            className={`w-full text-left px-2 py-1 text-sm rounded hover:bg-gray-100 ${
              selectedPath === path ? 'bg-blue-50' : ''
            }`}
          >
            📁 {path.split('/').join(' / ')}
          </button>
        ))}
      </div>
      
      <div className="flex gap-1 mt-3 pt-2 border-t border-gray-200">
        <button
          onClick={() => onMove(selectedPath)}
          className="btn btn-primary text-xs flex-1"
        >
          Move
        </button>
        <button
          onClick={onCancel}
          className="btn btn-secondary text-xs flex-1"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}