/*
 * Streaming SHA‑256 → CID v1 util.
 * For large files we could use WASM sha2; here we buffer because uploads are
 * browser‑selected & usually photo‑sized.  Replace with streaming worker later.
 */
import { CID } from "multiformats/cid";
import { sha256 } from "multiformats/hashes/sha2";
import { base32 } from "multiformats/bases/base32";

export async function fileToCid(file: Blob): Promise<string> {
  const buf = new Uint8Array(await file.arrayBuffer());
  const hash = await sha256.digest(buf);
  /*
   * `0x55` = raw binary content (multicodec code for raw) – OK for images/videos
   * You may choose dag‑pb or others later.
   */
  const cid = CID.create(1, 0x55, hash).toString(base32.encoder);
  return cid;
}
