import { write, file as otFile, dir } from "opfs-tools";
const PICTURES_DIR = "/pictures";
const THUMBS_DIR = "/thumbs";
let bytesWritten = 0;
export function getBytesWritten() {
  return bytesWritten;
}
export async function ensureDirs() {
  await Promise.all([dir(PICTURES_DIR).create(), dir(THUMBS_DIR).create()]);
}
export async function savePicture(cid: string, blob: Blob) {
  await ensureDirs();
  const path = `${PICTURES_DIR}/${cid}`;
  const target = otFile(path);
  if (await target.exists()) return false;
  await write(path, blob.stream(), { overwrite: false });
  bytesWritten += blob.size;
  return true;
}
export async function saveThumbnail(cid: string, blob: Blob) {
  await ensureDirs();
  await write(`${THUMBS_DIR}/${cid}.jpg`, blob.stream(), { overwrite: true });
  bytesWritten += blob.size;
}
export async function thumbUrl(cid: string) {
  const f = otFile(`${THUMBS_DIR}/${cid}.jpg`);
  if (!(await f.exists())) return null;
  const file = await f.getOriginFile();
  return file ? URL.createObjectURL(file) : null;
}

/** Object URL for the original asset (image or video) */
export async function rawUrl(cid: string) {
  const f = otFile(`${PICTURES_DIR}/${cid}`);
  if (!(await f.exists())) return null;
  const file = await f.getOriginFile();
  return file ? URL.createObjectURL(file) : null;
}
