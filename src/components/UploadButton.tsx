import React, { useRef } from "react";
import { UploadIcon } from "lucide-react";
import type { AlbumDoc } from "../yjs/album";
import type { PicMeta } from "../types";
import { savePicture, saveThumbnail } from "../utils/opfs";

interface WorkerMsg {
  id: string;
  meta: PicMeta;
  thumb: ArrayBuffer;
}

export function UploadButton({ album }: { album: AlbumDoc }) {
  /** Hidden <input type="file"> */
  const inputRef = useRef<HTMLInputElement>(null);

  /** Singleton worker & pending file map */
  const workerRef = useRef<Worker>();
  const pending = useRef<Map<string, File>>(new Map());

  if (!workerRef.current) {
    workerRef.current = new Worker(
      new URL("../workers/UploadWorker.ts", import.meta.url),
      { type: "module" },
    );
    workerRef.current.onmessage = async (ev: MessageEvent<WorkerMsg>) => {
      const { id, meta, thumb } = ev.data;
      const file = pending.current.get(id);
      if (!file) return;
      try {
        // Persist original & thumb
        await Promise.all([
          savePicture(meta.cid, file),
          saveThumbnail(meta.cid, new Blob([thumb], { type: "image/jpeg" })),
        ]);
        // Update Yjs metadata
        album.doc.transact(() => {
          album.pics.push([meta]);
        });
      } finally {
        pending.current.delete(id);
      }
    };
    workerRef.current.onerror = console.error;
  }

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    files.forEach((file) => {
      const id = crypto.randomUUID();
      pending.current.set(id, file);
      workerRef.current!.postMessage({ id, file });
    });

    e.target.value = "";
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        hidden
        onChange={handleChange}
      />
      <button
        onClick={() => inputRef.current?.click()}
        className="border px-3 py-1 rounded hover:bg-gray-100 active:scale-95 flex items-center gap-1"
      >
        <UploadIcon size={16} /> Upload
      </button>
    </>
  );
}
