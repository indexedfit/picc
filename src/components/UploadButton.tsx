import React, { useRef, useState } from "react";
import { UploadIcon } from "lucide-react";
import type { AlbumDoc } from "../yjs/albums";
import type { PicMeta } from "../types";
import { savePicture, saveThumbnail } from "../utils/opfs";

interface WorkerResponse {
  id: string;
  meta?: PicMeta;
  thumb?: ArrayBuffer;
  progress?: number;
}

export function UploadButton({ album }: { album: AlbumDoc }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<Map<string, number>>(new Map());

  const workerRef = useRef<Worker>();
  const pending = useRef<Map<string, File>>(new Map());

  if (!workerRef.current) {
    workerRef.current = new Worker(
      new URL("../workers/UploadWorker.ts", import.meta.url),
      { type: "module" },
    );
    workerRef.current.onmessage = async (ev: MessageEvent<WorkerResponse>) => {
      const { id, meta, thumb, progress: p } = ev.data;
      if (p !== undefined) {
        setProgress((prev) => new Map(prev).set(id, p));
        return;
      }
      const file = pending.current.get(id);
      if (!file || !meta || !thumb) return;
      try {
        await Promise.all([
          savePicture(meta.cid, file),
          saveThumbnail(meta.cid, new Blob([thumb], { type: "image/jpeg" })),
        ]);
        album.doc.transact(() => {
          if (!album.pics.toArray().some((pm) => pm.cid === meta.cid)) {
            album.pics.push([meta]);
          }
        });
      } finally {
        pending.current.delete(id);
        setProgress((prev) => {
          const n = new Map(prev);
          n.delete(id);
          return n;
        });
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
      setProgress((p) => new Map(p).set(id, 0));
      workerRef.current!.postMessage({ id, file, albumId: album.id });
    });
    e.target.value = "";
  };

  const pendingArr = Array.from(progress.values());
  const globalProg = pendingArr.length
    ? pendingArr.reduce((a, b) => a + b, 0) / pendingArr.length
    : 0;

  return (
    <div className="relative">
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
      {pendingArr.length > 0 && (
        <div className="absolute left-0 right-0 -bottom-2 h-1 bg-gray-200 rounded overflow-hidden">
          <div
            className="h-full bg-blue-500"
            style={{ width: `${globalProg * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}
