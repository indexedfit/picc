/* eslint-disable no-restricted-globals */
import { fileToCid } from "../utils/hash";
import type { PicMeta } from "../types";

interface UploadRequest {
  id: string;
  file: File;
}
interface UploadResponse {
  id: string;
  meta: PicMeta;
  thumb: ArrayBuffer;
}

self.onmessage = async (ev: MessageEvent<UploadRequest>) => {
  const { id, file } = ev.data;

  // 1️⃣  Hash → CID
  const cid = await fileToCid(file);

  // 2️⃣  Build square thumbnail (256×256)
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
    w: img.width,
    h: img.height,
  };

  // 3️⃣  Return meta + thumbnail buffer (transferable!)
  const response: UploadResponse = { id, meta, thumb: thumbBuf };
  // Transfer the ArrayBuffer to avoid copying
  postMessage(response, [thumbBuf]);
};
