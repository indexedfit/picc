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
  thumb?: ArrayBuffer;          // present for images
  needsVideoThumb?: boolean;    // true for videos
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

  let thumbBuf: ArrayBuffer | undefined = undefined;
  let needsVideoThumb = false;

  if (file.type.startsWith("image/")) {
    const img = await createImageBitmap(file);
    const size = 512; // sharper thumbs
    const canvas = new OffscreenCanvas(size, size);
    const ctx = canvas.getContext("2d")!;
    // High quality scaling
    (ctx as any).imageSmoothingEnabled = true;
    (ctx as any).imageSmoothingQuality = "high";
    // cover fit
    const r = Math.max(size / img.width, size / img.height);
    const w = Math.round(img.width * r);
    const h = Math.round(img.height * r);
    const x = Math.floor((size - w) / 2);
    const y = Math.floor((size - h) / 2);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(img, x, y, w, h);
    const thumbBlob = await canvas.convertToBlob({
      type: "image/jpeg",
      quality: 0.82,
    });
    thumbBuf = await thumbBlob.arrayBuffer();
  } else if (file.type.startsWith("video/")) {
    // Worker can't decode video frames portably; signal main thread to create poster.
    needsVideoThumb = true;
  }

  const meta: PicMeta = {
    cid,
    name: file.name,
    type: file.type,
    ts: Date.now(),
    albumId,
    // w/h filled only for images here (optional enhancement: parse via ImageBitmap for images only)
  };

  postMessage({ id, progress: 1 } as ProgressMsg);
  const payload: UploadResponse = { id, meta };
  if (thumbBuf) payload.thumb = thumbBuf;
  if (needsVideoThumb) payload.needsVideoThumb = true;
  // Transfer only if thumb exists
  if (thumbBuf) {
    postMessage(payload, [thumbBuf]);
  } else {
    postMessage(payload);
  }
};
