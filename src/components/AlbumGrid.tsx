import React, { useEffect, useState } from "react";
import { thumbUrl } from "../utils/opfs";
import type { AlbumDoc } from "../yjs/albums";
import type { PicMeta } from "../types";
import { View } from "./ViewToggle";
interface AlbumGridProps {
  album: AlbumDoc;
  view: View;
  selectedPics: Set<string>;
  onSelectionChange: (selection: Set<string>) => void;
  onOpen?: (index: number) => void;
}

export function AlbumGrid({ album, view, selectedPics, onSelectionChange, onOpen }: AlbumGridProps) {
  const [pics, setPics] = useState<PicMeta[]>(album.pics.toArray());
  useEffect(() => {
    // Update pics immediately when album changes
    setPics(album.pics.toArray());
    
    const obs = () => setPics(album.pics.toArray());
    album.pics.observe(obs);
    return () => album.pics.unobserve(obs);
  }, [album.id]); // Use album.id as dependency to trigger when switching albums
  if (view === "list") {
    return (
      <table className="album-list">
        <tbody>
          {pics.map((p) => (
            <Row key={p.cid} pic={p} />
          ))}
        </tbody>
      </table>
    );
  }
  return (
    <div className="album-grid">
      {pics.map((p, i) => (
        <Thumb 
          key={p.cid} 
          pic={p} 
          selected={selectedPics.has(p.cid)}
          onToggle={() => {
            const newSelection = new Set(selectedPics);
            if (newSelection.has(p.cid)) {
              newSelection.delete(p.cid);
            } else {
              newSelection.add(p.cid);
            }
            onSelectionChange(newSelection);
          }}
          selectedPics={selectedPics}
          onOpen={() => onOpen?.(i)}
        />
      ))}
    </div>
  );
}
function Row({ pic }: { pic: PicMeta }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    thumbUrl(pic.cid).then(setUrl);
  }, [pic.cid]);
  return (
    <tr className="album-list-row">
      <td className="album-list-thumb">
        {url && <img src={url} className="album-list-thumb-img" />}
      </td>
      <td className="album-list-name">{pic.name}</td>
      <td className="album-list-date">
        {new Date(pic.ts).toLocaleDateString()}
      </td>
    </tr>
  );
}
interface ThumbProps {
  pic: PicMeta;
  selected: boolean;
  onToggle: () => void;
  selectedPics: Set<string>;
  onOpen: () => void;
}

function Thumb({ pic, selected, onToggle, selectedPics, onOpen }: ThumbProps) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    thumbUrl(pic.cid).then(setUrl);
  }, [pic.cid]);
  return (
    <div 
      className={`album-grid-item ${selected ? 'selected' : ''}`}
      onClick={(e) => {
        // If no selection yet, a click opens; otherwise toggle selection
        if (selectedPics.size === 0) onOpen();
        else onToggle();
      }}
      onDoubleClick={(e) => onOpen()}
      draggable={selectedPics.size > 0}
      onDragStart={(e) => {
        if (selectedPics.size > 0) {
          const cids = Array.from(selectedPics);
          e.dataTransfer?.setData('text/plain', JSON.stringify(cids));
        }
      }}
    >
      {url && <img className="img-thumb" src={url} alt={pic.name} />}
      {selected && (
        <div className="selection-indicator">
          <div className="checkmark">✓</div>
        </div>
      )}
    </div>
  );
}
