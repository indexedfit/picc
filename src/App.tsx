import React, { useState } from "react";
import { AlbumGrid } from "./components/AlbumGrid";
import { UploadButton } from "./components/UploadButton";
import { useAlbums } from "./yjs/album";
import { View, ViewToggle } from "./components/ViewToggle";
import { AlbumSelector } from "./components/AlbumSelector";
import { ChatPane } from "./components/ChatPane";

export default function App() {
  const { albums, current, setCurrent, ready } = useAlbums();
  const [view, setView] = useState<View>("grid");

  if (!ready) return null; // loading IndexedDB

  return (
    <div className="min-h-screen flex flex-col">
      <header className="p-4 border-b bg-white sticky top-0 z-10 flex items-center gap-2">
        <AlbumSelector
          albums={albums}
          current={current}
          onSelect={setCurrent}
        />
        <div className="flex-1" />
        <ViewToggle view={view} setView={setView} />
        <UploadButton album={current} />
      </header>

      <main className="flex-1 overflow-y-auto p-4">
        <AlbumGrid album={current} view={view} />
      </main>

      <ChatPane album={current} />
    </div>
  );
}
