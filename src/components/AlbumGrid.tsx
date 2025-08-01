import React, { useEffect, useState } from "react";
import { thumbUrl } from "../utils/opfs";
import type { AlbumDoc } from "../yjs/albums";
import type { PicMeta } from "../types";
import { View } from "./ViewToggle";

export function AlbumGrid({ album, view }: { album: AlbumDoc; view: View }) {
  const [pics, setPics] = useState<PicMeta[]>(album.pics.toArray());
  useEffect(() => {
    const obs = () => setPics(album.pics.toArray());
    album.pics.observe(obs);
    return () => album.pics.unobserve(obs);
  }, [album]);

  if (view === "list") {
    return (
      <table className="w-full text-sm">
        <tbody>
          {pics.map((p) => (
            <Row key={p.cid} pic={p} />
          ))}
        </tbody>
      </table>
    );
  }

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

function Row({ pic }: { pic: PicMeta }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    thumbUrl(pic.cid).then(setUrl);
  }, [pic.cid]);
  return (
    <tr className="border-b last:border-0">
      <td className="py-1 w-16">
        {url && <img src={url} className="w-12 h-12 object-cover rounded" />}
      </td>
      <td>{pic.name}</td>
      <td className="text-right text-gray-500">
        {new Date(pic.ts).toLocaleDateString()}
      </td>
    </tr>
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
