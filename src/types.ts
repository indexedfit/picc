export interface PicMeta {
  cid: string; // Multibase‑encoded CID (e.g. "bafy…")
  name: string; // Original filename (can be edited later)
  type: string; // MIME type
  ts: number; // Unix epoch ms when added
  w?: number; // width (filled after thumb gen)
  h?: number; // height
}
