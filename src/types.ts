export interface PicMeta {
  cid: string;
  name: string;
  type: string;
  ts: number;
  albumId: string; // reference to album
  w?: number;
  h?: number;
}

export interface AlbumMeta {
  id: string;
  name: string;
}
