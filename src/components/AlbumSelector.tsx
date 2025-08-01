import React, { useState } from "react";
import type { AlbumMeta } from "../types";
import type { AlbumDoc } from "../yjs/albums";

export function AlbumSelector({
  albums,
  current,
  onSelect,
}: {
  albums: AlbumMeta[];
  current: AlbumDoc;
  onSelect: (a: AlbumDoc) => void;
}) {
  const [newName, setNewName] = useState("");
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
    <div className="flex items-center gap-2">
      <select
        className="border px-2 py-1 rounded"
        value={current.id}
        onChange={(e) =>
          onSelect(albums.find((a) => a.id === e.target.value) as any)
        }
      >
        {albums.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>
      <input
        className="border rounded px-2 py-1 w-32"
        placeholder="New album"
        value={newName}
        onChange={(e) => setNewName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && createAlbum()}
      />
    </div>
  );
}
