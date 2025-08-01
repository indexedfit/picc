import React, { useState } from "react";
import * as Y from "yjs";
import type { AlbumMeta } from "../types";
import type { AlbumDoc } from "../yjs/albums";
interface AlbumSelectorProps {
  albums: AlbumMeta[];
  current: AlbumDoc;
  onSelect: (a: AlbumDoc) => void;
}

export function AlbumSelector({ albums, current, onSelect }: AlbumSelectorProps) {
  const [newName, setNewName] = useState("");
  
  const moveImagesToAlbum = (cids: string[], targetAlbumId: string) => {
    current.doc.transact(() => {
      const albumsMap = current.doc.getMap("albums");
      const targetAlbum = albumsMap.get(targetAlbumId);
      if (!targetAlbum) return;
      
      const targetPics = targetAlbum.get("pics");
      const currentPics = current.pics.toArray();
      
      cids.forEach(cid => {
        const pic = currentPics.find(p => p.cid === cid);
        if (pic && !targetPics.toArray().some((p: any) => p.cid === cid)) {
          targetPics.push([pic]);
        }
      });
    });
  };
  
  const createAlbum = () => {
    if (!newName.trim()) return;
    current.doc.transact(() => {
      const albumsMap = current.doc.getMap("albums");
      const id = crypto.randomUUID();
      const rec = new Y.Map();
      rec.set("info", { id, name: newName.trim() });
      rec.set("pics", new Y.Array());
      rec.set("chat", new Y.Array());
      albumsMap.set(id, rec);
    });
    setNewName("");
  };
  return (
    <div>
      <div className="sidebar-header">Albums</div>
      {albums.map((a) => (
        <div
          key={a.id}
          className={`album-item ${a.id === current.id ? "active" : ""}`}
          onClick={() => onSelect(a as any)}
          onDragOver={(e) => {
            e.preventDefault();
            e.currentTarget.classList.add('drag-over');
          }}
          onDragLeave={(e) => {
            e.currentTarget.classList.remove('drag-over');
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.currentTarget.classList.remove('drag-over');
            const cids = JSON.parse(e.dataTransfer?.getData('text/plain') || '[]');
            if (cids.length > 0) {
              moveImagesToAlbum(cids, a.id);
            }
          }}
        >
          {a.name}
        </div>
      ))}
      <div className="flex gap-1 px-2 py-2 border-t">
        <input
          className="album-input"
          placeholder="New album..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && createAlbum()}
        />
        <button onClick={createAlbum} className="album-add-btn">
          +
        </button>
      </div>
    </div>
  );
}
