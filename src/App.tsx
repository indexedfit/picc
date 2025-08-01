import React from "react";
import { AlbumGrid } from "./components/AlbumGrid";
import { UploadButton } from "./components/UploadButton";
import { useAlbumDoc } from "./yjs/album";

export default function App() {
  // We keep a single Y.Doc for now; future: multi‑album docs / subdocs.
  const { album } = useAlbumDoc("all-pictures");

  return (
    <div className="min-h-screen flex flex-col">
      <header className="p-4 border-b bg-white sticky top-0 z-10 flex items-center justify-between">
        <h1 className="text-xl">📸 picc.fit</h1>
        <UploadButton album={album} />
      </header>
      <main className="flex-1 overflow-y-auto p-4">
        <AlbumGrid album={album} />
      </main>
    </div>
  );
}
