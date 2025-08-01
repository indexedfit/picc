import React from "react";
import QRCode from "qrcode.react";
import type { AlbumDoc } from "../yjs/albums";

export function ShareQR({ album }: { album: AlbumDoc }) {
  const url = `${location.origin}${location.pathname}#${album.id}`;
  return (
    <div className="p-4 text-center">
      <p className="mb-2 text-sm">Scan to open this album</p>
      <QRCode value={url} size={128} />
      <p className="mt-2 break-all text-xs text-gray-600">{url}</p>
    </div>
  );
}
