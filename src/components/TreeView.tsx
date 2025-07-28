import { useState } from "react";
import type { Manifest, FileEntry, FolderEntry } from "../lib/manifest";

interface TreeNode {
  id: string;
  name: string;
  type: "folder" | "file";
  path?: string;
  children: TreeNode[];
  entry?: FileEntry | FolderEntry;
}

interface Props {
  manifest: Manifest;
  selectedPath?: string;
  onSelectFolder: (path: string | undefined) => void;
  onCreateFolder: (name: string, parentPath?: string) => void;
  onUpdateFolder: (path: string, description: string) => void;
}

export default function TreeView({
  manifest,
  selectedPath,
  onSelectFolder,
  onCreateFolder,
  onUpdateFolder,
}: Props) {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [newFolderName, setNewFolderName] = useState("");
  const [editingPath, setEditingPath] = useState<string | null>(null);

  // Build tree structure from manifest
  function buildTree(): TreeNode {
    const root: TreeNode = {
      id: "root",
      name: "Gallery",
      type: "folder",
      children: [],
    };

    // Add folders to tree
    const folderNodes: Record<string, TreeNode> = { "": root };
    
    if (manifest.folders) {
      // Sort folders by path depth to ensure parents are created first
      const sortedFolders = Object.entries(manifest.folders)
        .filter(([_, f]) => !f.deleted)
        .sort(([a], [b]) => a.split("/").length - b.split("/").length);

      for (const [fullPath, folder] of sortedFolders) {
        const node: TreeNode = {
          id: fullPath,
          name: folder.name,
          type: "folder",
          path: fullPath,
          children: [],
          entry: folder,
        };
        
        folderNodes[fullPath] = node;
        
        // Add to parent
        const parentPath = folder.path || "";
        const parent = folderNodes[parentPath];
        if (parent) {
          parent.children.push(node);
        }
      }
    }

    // Count files per folder
    const fileCounts: Record<string, number> = {};
    Object.values(manifest.files).forEach(file => {
      if (!file.deleted) {
        const path = file.path || "";
        fileCounts[path] = (fileCounts[path] || 0) + 1;
      }
    });

    return root;
  }

  const tree = buildTree();

  function renderNode(node: TreeNode, depth: number): JSX.Element {
    const isExpanded = expandedPaths.has(node.id);
    const isSelected = selectedPath === (node.id === "root" ? undefined : node.id);
    const folder = node.entry as FolderEntry | undefined;
    
    // Count files in this folder
    const fileCount = Object.values(manifest.files).filter(
      f => !f.deleted && f.path === (node.id === "root" ? undefined : node.id)
    ).length;

    return (
      <div key={node.id} style={{ marginLeft: `${depth * 1}rem` }}>
        <div
          className={`flex items-center gap-2 py-1.5 px-3 cursor-pointer hover:bg-gray-100 ${
            isSelected ? "bg-blue-50 border-l-2 border-blue-500" : ""
          }`}
          onClick={() => {
            onSelectFolder(node.id === "root" ? undefined : node.id);
            if (node.children.length > 0) {
              const next = new Set(expandedPaths);
              if (isExpanded) {
                next.delete(node.id);
              } else {
                next.add(node.id);
              }
              setExpandedPaths(next);
            }
          }}
        >
          <span className="text-gray-400 text-xs">
            {node.children.length > 0 ? (isExpanded ? "▼" : "▶") : "•"}
          </span>
          <span className="text-sm flex-1">{node.name}</span>
          <span className="text-xs text-gray-400">{fileCount}</span>
        </div>
        
        {folder?.description && editingPath !== node.id && (
          <div className="ml-8 text-xs text-gray-600 italic font-mono">
            {folder.description}
          </div>
        )}
        
        {editingPath === node.id && (
          <div className="ml-8 mt-1">
            <input
              type="text"
              className="font-mono text-xs border px-1 py-0.5 w-full"
              defaultValue={folder?.description || ""}
              placeholder="Folder description..."
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onUpdateFolder(node.id, e.currentTarget.value);
                  setEditingPath(null);
                } else if (e.key === "Escape") {
                  setEditingPath(null);
                }
              }}
              onBlur={(e) => {
                onUpdateFolder(node.id, e.currentTarget.value);
                setEditingPath(null);
              }}
              autoFocus
            />
          </div>
        )}
        
        {isExpanded && node.children.map(child => renderNode(child, depth + 1))}
      </div>
    );
  }

  return (
    <div className="h-full bg-white">
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-semibold text-sm mb-3">Folders</h3>
        <div className="flex gap-1">
          <input
            type="text"
            className="flex-1 text-sm border border-gray-300 rounded px-2 py-1"
            placeholder="New folder..."
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newFolderName.trim()) {
                onCreateFolder(newFolderName.trim(), selectedPath);
                setNewFolderName("");
              }
            }}
          />
          <button
            onClick={() => {
              if (newFolderName.trim()) {
                onCreateFolder(newFolderName.trim(), selectedPath);
                setNewFolderName("");
              }
            }}
            className="btn btn-primary text-sm px-3"
          >
            Add
          </button>
        </div>
      </div>
      
      <div className="overflow-y-auto" style={{ height: 'calc(100% - 8rem)' }}>
        {renderNode(tree, 0)}
      </div>
      
      {selectedPath && (
        <div className="p-3 border-t border-gray-200">
          <button
            onClick={() => setEditingPath(selectedPath)}
            className="text-xs text-gray-600 hover:text-gray-800"
          >
            Edit description
          </button>
        </div>
      )}
    </div>
  );
}