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
  // Initialize from URL hash so ShareQR/opening a link lands in the right album
  const [currentId, setCurrentId] = useState<string>(() => {
    const hash = location.hash?.slice(1);
    return hash || "all";
  });

  const state = useMemo(() => {
    const doc = new Y.Doc();
    const albumsMap = doc.getMap<Y.Map<any>>("albums");

    const persistence = new IndexeddbPersistence("piccfit-root", doc);
    persistence.once("synced", () => {
      // Bootstrap default album after sync if it doesn't exist
      if (!albumsMap.has("all")) {
        const meta = new Y.Map<AlbumMeta>();
        meta.set("info", { id: "all", name: "All Pictures" });
        meta.set("pics", new Y.Array<PicMeta>());
        meta.set("chat", new Y.Array());
        albumsMap.set("all", meta);
      }
      setReady(true);
    });

    const albumFromKey = (key: string): AlbumDoc => {
      let rec = albumsMap.get(key);
      if (!rec) {
        // Fallback to "all" if invalid key
        key = "all";
        rec = albumsMap.get("all");
        if (!rec) throw new Error("invalid album: no fallback");
      }
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

  // Observe YJS changes to trigger re-renders
  const [albumsData, setAlbumsData] = useState<AlbumMeta[]>([]);
  useEffect(() => {
    const updateAlbums = () => {
      setAlbumsData(state.getAllMeta());
    };
    state.albumsMap.observe(updateAlbums);
    updateAlbums(); // Initial load
    return () => state.albumsMap.unobserve(updateAlbums);
  }, [state.albumsMap, state]);

  // React to manual hash changes (back/forward, pasted links)
  useEffect(() => {
    const onHash = () => {
      const id = location.hash?.slice(1) || "all";
      setCurrentId(id);
    };
    addEventListener("hashchange", onHash);
    return () => removeEventListener("hashchange", onHash);
  }, []);

  // Only get current album if ready and it exists, otherwise fallback to "all"
  let actualCurrentId = currentId;
  let current: AlbumDoc | null = null;
  
  if (ready) {
    if (!state.albumsMap.has(currentId)) {
      actualCurrentId = "all";
      // Update URL hash if we had to fallback
      if (currentId !== "all") {
        setCurrentId("all");
        location.hash = "all";
      }
    }
    current = state.albumFromKey(actualCurrentId);
  }

  // Don't render until we have a valid current album
  if (!current) {
    return {
      albums: [],
      current: null as any,
      setCurrent: (a) => {
        const id = (a as any).id ?? String(a);
        setCurrentId(id);
        if (location.hash.slice(1) !== id) {
          location.hash = id; // keep URL in sync
        }
      },
      ready: false,
    };
  }

  return {
    albums: albumsData,
    current,
    setCurrent: (a) => {
      const id = (a as any).id ?? String(a);
      setCurrentId(id);
      if (location.hash.slice(1) !== id) {
        location.hash = id; // keep URL in sync
      }
    },
    ready,
  };
}
