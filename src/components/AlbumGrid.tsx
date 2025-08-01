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
}

export function AlbumGrid({ album, view, selectedPics, onSelectionChange }: AlbumGridProps) {
  const [pics, setPics] = useState<PicMeta[]>(album.pics.toArray());
  useEffect(() => {
    const obs = () => setPics(album.pics.toArray());
    album.pics.observe(obs);
    return () => album.pics.unobserve(obs);
  }, [album]);
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
      {pics.map((p) => (
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
}

function Thumb({ pic, selected, onToggle, selectedPics }: ThumbProps) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    thumbUrl(pic.cid).then(setUrl);
  }, [pic.cid]);
  return (
    <div 
      className={`album-grid-item ${selected ? 'selected' : ''}`}
      onClick={onToggle}
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
