import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";
import { useEffect, useMemo, useState } from "react";
import type { AlbumMeta, PicMeta } from "../types";

interface AlbumsHook {
  albums: AlbumMeta[];
  current: AlbumDoc;
  setCurrent: (album: AlbumDoc) => void;
  ready: boolean;
}

export interface AlbumDoc {
  id: string;
  meta: AlbumMeta;
  pics: Y.Array<PicMeta>;
  chat: Y.Array<{ from: string; msg: string; ts: number }>;
  doc: Y.Doc; // shared parent doc
}

export function useAlbums(): AlbumsHook {
  const [ready, setReady] = useState(false);
  const [currentId, setCurrentId] = useState<string>("all");

  const state = useMemo(() => {
    const doc = new Y.Doc();
    const albumsMap = doc.getMap<Y.Map<any>>("albums");

    // bootstrap default album
    if (!albumsMap.has("all")) {
      const meta = new Y.Map<AlbumMeta>();
      meta.set("info", { id: "all", name: "All Pictures" });
      meta.set("pics", new Y.Array<PicMeta>());
      meta.set("chat", new Y.Array());
      albumsMap.set("all", meta);
    }

    const persistence = new IndexeddbPersistence("piccfit-root", doc);
    persistence.once("synced", () => setReady(true));

    const albumFromKey = (key: string): AlbumDoc => {
      let rec = albumsMap.get(key);
      if (!rec) throw new Error("invalid album");
      return {
        id: key,
        meta: rec.get("info"),
        pics: rec.get("pics"),
        chat: rec.get("chat"),
        doc,
      } as AlbumDoc;
    };

    const getAllMeta = (): AlbumMeta[] => {
      return Array.from(albumsMap.values()).map(
        (v) => v.get("info") as AlbumMeta,
      );
    };

    return { doc, albumsMap, albumFromKey, getAllMeta };
  }, []);

  const albums = state.getAllMeta();
  const current = state.albumFromKey(currentId);

  return {
    albums,
    current,
    setCurrent: (a) => setCurrentId(a.id),
    ready,
  };
}
