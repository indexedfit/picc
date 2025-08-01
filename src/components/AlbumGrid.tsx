import React, { useEffect, useState } from "react";
import { thumbUrl } from "../utils/opfs";
import type { AlbumDoc } from "../yjs/album";
import type { PicMeta } from "../types";

export function AlbumGrid({ album }: { album: AlbumDoc }) {
  const [pics, setPics] = useState<PicMeta[]>(album.pics.toArray());

  useEffect(() => {
    const observer = (e: Y.YArrayEvent<PicMeta>) => {
      setPics(album.pics.toArray());
    };
    album.pics.observe(observer);
    return () => album.pics.unobserve(observer);
  }, [album]);

  return (
    <div
      className="grid gap-2"
      style={{ gridTemplateColumns: "repeat(auto-fill, minmax(128px, 1fr))" }}
    >
      {pics.map((p) => (
        <Thumb key={p.cid} pic={p} />
      ))}
    </div>
  );
}

function Thumb({ pic }: { pic: PicMeta }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    thumbUrl(pic.cid).then(setUrl);
  }, [pic.cid]);

  return (
    <div className="aspect-square bg-gray-200 rounded overflow-hidden relative">
      {url && (
        <img src={url} alt={pic.name} className="w-full h-full object-cover" />
      )}
    </div>
  );
}
