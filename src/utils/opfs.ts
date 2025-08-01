import { write, file as otFile, dir } from "opfs-tools";

const PICTURES_DIR = "/pictures";
const THUMBS_DIR = "/thumbs";

export async function ensureDirs() {
  await Promise.all([dir(PICTURES_DIR).create(), dir(THUMBS_DIR).create()]);
}

/**
 * Stream‑writes the original asset (image / video) into OPFS.
 * Skips if the file already exists to avoid duplicate work.
 */
export async function savePicture(cid: string, blob: Blob) {
  await ensureDirs();
  const path = `${PICTURES_DIR}/${cid}`;
  const target = otFile(path);
  if (await target.exists()) return; // idempotent
  await write(path, blob.stream(), { overwrite: false });
}

/** Persist thumbnail JPEG */
export async function saveThumbnail(cid: string, blob: Blob) {
  await ensureDirs();
  await write(`${THUMBS_DIR}/${cid}.jpg`, blob.stream(), { overwrite: true });
}

export async function thumbUrl(cid: string) {
  const f = otFile(`${THUMBS_DIR}/${cid}.jpg`);
  if (!(await f.exists())) return null;
  const file = await f.getOriginFile();
  return file ? URL.createObjectURL(file) : null;
}
