import React, { useState, useEffect } from "react";
import { AlbumGrid } from "./components/AlbumGrid";
import { UploadButton } from "./components/UploadButton";
import { useAlbums } from "./yjs/albums";
import { View, ViewToggle } from "./components/ViewToggle";
import { AlbumSelector } from "./components/AlbumSelector";
import { ChatPane } from "./components/ChatPane";
import { Lightbox } from "./components/Lightbox";
export default function App() {
  const { albums, current, setCurrent, ready } = useAlbums();
  const [view, setView] = useState<View>("grid");
  const [selectedPics, setSelectedPics] = useState<Set<string>>(new Set());
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  
  useEffect(() => {
    // Clear selection when album changes
    if (ready && current) {
      setSelectedPics(new Set());
      setViewerIndex(null);
    }
  }, [current?.id, ready]);
  
  if (!ready) return null;
  const pics = current.pics.toArray();
  return (
    <div className="app-container">
      <aside className="sidebar">
        <AlbumSelector
          albums={albums}
          current={current}
          onSelect={(id) => setCurrent({ id } as any)}
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
            onOpen={(i) => setViewerIndex(i)}
          />
        </main>
      </div>
      <ChatPane album={current} />
      {viewerIndex !== null && pics.length > 0 && (
        <Lightbox
          pics={pics}
          index={viewerIndex}
          setIndex={setViewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </div>
  );
}
