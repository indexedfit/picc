/* eslint-disable no-restricted-globals */
import { fileToCid } from "../utils/hash";
import type { PicMeta } from "../types";

interface UploadRequest {
  id: string;
  file: File;
  albumId: string;
}
interface UploadResponse {
  id: string;
  meta: PicMeta;
  thumb: ArrayBuffer;
}
interface ProgressMsg {
  id: string;
  progress: number;
}

type Outgoing = UploadResponse | ProgressMsg;

self.onmessage = async (ev: MessageEvent<UploadRequest>) => {
  const { id, file, albumId } = ev.data;

  const cid = await fileToCid(file);

  // naive progress: hashing complete → 50%
  postMessage({ id, progress: 0.5 } as ProgressMsg);

  const img = await createImageBitmap(file);
  const size = 256;
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext("2d")!;
  const ratio = Math.min(size / img.width, size / img.height);
  const w = img.width * ratio;
  const h = img.height * ratio;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
  const thumbBlob = await canvas.convertToBlob({
    type: "image/jpeg",
    quality: 0.8,
  });
  const thumbBuf = await thumbBlob.arrayBuffer();

  const meta: PicMeta = {
    cid,
    name: file.name,
    type: file.type,
    ts: Date.now(),
    albumId,
    w: img.width,
    h: img.height,
  };

  postMessage({ id, progress: 1 } as ProgressMsg);
  postMessage({ id, meta, thumb: thumbBuf } as UploadResponse, [thumbBuf]);
};
