import React, { useState } from "react";
import { AlbumGrid } from "./components/AlbumGrid";
import { UploadButton } from "./components/UploadButton";
import { useAlbums } from "./yjs/albums";
import { View, ViewToggle } from "./components/ViewToggle";
import { AlbumSelector } from "./components/AlbumSelector";
import { ChatPane } from "./components/ChatPane";
export default function App() {
  const { albums, current, setCurrent, ready } = useAlbums();
  const [view, setView] = useState<View>("grid");
  const [selectedPics, setSelectedPics] = useState<Set<string>>(new Set());
  if (!ready) return null;
  return (
    <div className="app-container">
      <aside className="sidebar">
        <AlbumSelector
          albums={albums}
          current={current}
          onSelect={setCurrent}
        />
      </aside>
      <div className="main-content">
        <header className="header">
          <ViewToggle view={view} setView={setView} />
          <div className="flex-1" />
          <UploadButton album={current} />
        </header>
        <main className="content-area">
          <AlbumGrid 
            album={current} 
            view={view} 
            selectedPics={selectedPics}
            onSelectionChange={setSelectedPics}
          />
        </main>
      </div>
      <ChatPane album={current} />
    </div>
  );
}
